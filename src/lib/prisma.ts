import { PrismaClient } from "@prisma/client";

/**
 * Клієнт Prisma як singleton.
 *
 * У dev Next.js перезавантажує модулі на кожній зміні — без кешу в
 * `globalThis` кожен hot-reload створював би новий пул з'єднань і
 * Postgres швидко впирався у `max_connections`.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Під час `next build` база даних НЕ обов'язкова: лендінг пререндериться з
 * контентом за замовчуванням (`readDb` нижче перехоплює збої). Тому власний
 * `error`-лог Prisma на цій фазі вимкнено — інакше свіжа збірка без Postgres
 * засипає stdout десятками «Can't reach database server at localhost:5432»,
 * у яких легко не побачити справжню помилку.
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isBuildPhase ? [] : process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Чи взагалі заданий DATABASE_URL. */
export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

/**
 * Чи схема застосована (таблиці існують). Виставляється в true, щойно
 * хоч один запит пройшов успішно — щоб не перевіряти це щоразу.
 */
let schemaReady = false;

export function markSchemaReady() {
  schemaReady = true;
}

export function isSchemaKnownReady() {
  return schemaReady;
}

/**
 * Читання з бази, яке НІКОЛИ не валить рендер.
 *
 * Лендінг і /admin мусять відкриватись навіть якщо PostgreSQL ще не
 * піднятий (типова ситуація одразу після `git clone`). Тому всі
 * read-функції контенту йдуть через цю обгортку й отримують `null`,
 * після чого підставляють дані з `src/data/site-content.ts`.
 *
 * ⚠️ Для запису (створення заявки, правки в адмінці) НЕ використовуйте
 * цю функцію — там помилку треба показати користувачеві, а не ковтати.
 */
export async function readDb<T>(query: () => Promise<T>): Promise<T | null> {
  if (!isDatabaseConfigured) return null;
  try {
    const result = await query();
    markSchemaReady();
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[db] читання скасовано:", describeDbError(error));
    }
    return null;
  }
}

/**
 * Перевірка, чи база реально відповідає (для /api/health і підказок в
 * адмінці). Повертає статус і людське пояснення.
 */
export async function checkDatabase(): Promise<{
  ok: boolean;
  configured: boolean;
  message: string;
}> {
  if (!isDatabaseConfigured) {
    return {
      ok: false,
      configured: false,
      message: "DATABASE_URL не заданий — скопіюйте .env.example у .env",
    };
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'leads'
    `;
    if (Number(count) === 0) {
      return {
        ok: false,
        configured: true,
        message: "З'єднання є, але схема не створена — виконайте `npm run db:setup`",
      };
    }
    markSchemaReady();
    return { ok: true, configured: true, message: "База даних доступна" };
  } catch (error) {
    return { ok: false, configured: true, message: describeDbError(error) };
  }
}

/**
 * Перетворює технічну помилку Prisma у зрозуміле українське речення.
 * Код помилки (P1001 тощо) лишаємо в дужках — він потрібен для дебагу.
 */
export function describeDbError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const raw = error instanceof Error ? error.message : String(error);

  switch (code) {
    case "P1000":
      return "Невірний логін або пароль до бази даних (P1000)";
    case "P1001":
      return "База даних недоступна — перевірте, чи запущений PostgreSQL (P1001)";
    case "P1003":
      return "Бази з такою назвою не існує (P1003)";
    case "P1017":
      return "З'єднання з базою закрито сервером (P1017)";
    case "P2021":
      return "Таблиці не існують — схема не застосована, виконайте `npm run db:setup` (P2021)";
    case "P2002":
      return "Запис з таким унікальним значенням уже існує (P2002)";
    case "P2025":
      return "Запис не знайдено (P2025)";
    default:
      break;
  }
  if (raw.includes("ECONNREFUSED")) {
    return "Не вдалось підключитись до PostgreSQL на вказаному хості та порту";
  }
  if (raw.includes("Environment variable not found")) {
    return "Не заданий DATABASE_URL у .env";
  }
  return raw;
}
