/**
 * Дрібні помічники, спільні для всіх API-роутів.
 *
 * Навіщо окремий модуль: формат помилки, перевірка адмін-сесії та
 * розпізнавання «запис не знайдено» мусять бути однаковими в
 * чотирнадцяти роутах — копіювання гарантує розбіжність у кодах статусу.
 *
 * Файл лежить у `_lib`, тому Next.js не вважає його роутом.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/auth";
import { formatZodError } from "@/lib/validations";

/** Тіло помилки — той самий конверт, що й у вдалих відповідей. */
export type ApiErrorBody = {
  ok: false;
  message: string;
  /** Помилки по конкретних полях форми. */
  fields?: Record<string, string>;
};

/** Помилка у єдиному форматі. */
export function fail(message: string, status: number, fields?: Record<string, string>): NextResponse {
  const body: ApiErrorBody = { ok: false, message };
  if (fields) body.fields = fields;
  return NextResponse.json(body, { status });
}

/** Те саме, але з `Retry-After`, щоб клієнт знав, коли повторити. */
export function failRetryAfter(message: string, retryAfterSeconds: number): NextResponse {
  const response = fail(message, 429);
  response.headers.set("Retry-After", String(Math.max(1, Math.ceil(retryAfterSeconds))));
  return response;
}

/**
 * Пропускає запит далі або повертає 401.
 *
 * Повертає `null`, коли сесія є — тобто «помилки немає»:
 *
 * ```ts
 * const unauthorized = await requireAdmin();
 * if (unauthorized) return unauthorized;
 * ```
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getAdminSession();
  if (!session) return fail("Потрібна авторизація", 401);
  return null;
}

/** `P2025` — Prisma не знайшла запис для `update`/`delete`. */
export function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return String((error as { code: unknown }).code) === "P2025";
}

/**
 * Читає JSON-тіло. Повертає `null`, якщо тіло не є коректним
 * JSON-об'єктом — далі роут відповідає 400, а не падає з 500.
 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Позитивне ціле з query-параметра з безпечним значенням за замовчуванням. */
export function toPositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

/**
 * Українська підказка замість системної англійської.
 *
 * zod пише власні тексти на кшталт «Required» або «Expected string,
 * received number» — вони потрапляють у UI, тому їх не можна лишати.
 * Схеми з власними повідомленнями цей словник не зачіпає: zod бере
 * авторський текст, якщо він заданий у самій перевірці.
 */
const ukrainianErrorMap: z.ZodErrorMap = (issue, context) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return {
        message:
          issue.received === "undefined"
            ? "Заповніть, будь ласка, це поле"
            : "Некоректне значення поля",
      };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Оберіть, будь ласка, значення зі списку" };
    case z.ZodIssueCode.invalid_literal:
      return { message: "Некоректне значення поля" };
    case z.ZodIssueCode.too_small:
      return { message: "Значення занадто коротке" };
    case z.ZodIssueCode.too_big:
      return { message: "Значення занадто довге" };
    case z.ZodIssueCode.invalid_string:
      return { message: "Некоректний текст" };
    default:
      return { message: context.defaultError };
  }
};

type ParseOutcome<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Розбір тіла запиту схемою: успіх віддає дані, помилка — готову
 * відповідь 400 з українським текстом і помилками по полях.
 */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): ParseOutcome<T> {
  const parsed = schema.safeParse(body, { errorMap: ukrainianErrorMap });
  if (!parsed.success) {
    const { message, fields } = formatZodError(parsed.error);
    return { ok: false, response: fail(message, 400, fields) };
  }
  return { ok: true, data: parsed.data };
}
