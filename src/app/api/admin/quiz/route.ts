/**
 * Конфігурація квіза та ваг калькулятора — один рядок (id = 1).
 *
 * `GET` не створює рядок: якщо його немає, повертаються типові значення з
 * `src/data/quiz-config.ts`, щоб редактор у /admin/quiz був заповнений.
 *
 * `PATCH` приймає документ ЦІЛКОМ (`quizConfigSchema`), а не окремі поля.
 * Так зроблено навмисно: варіанти й порядок редагуються як одне ціле, і
 * часткове оновлення легко призвело б до неузгодженого стану (наприклад,
 * переставлений варіант без збереженої ваги).
 *
 * Після збереження викликається `revalidatePath("/")`, бо лендінг
 * кешується (ISR) — без цього правки не з'являться на сайті.
 */

import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_QUIZ_CONFIG } from "@/data/quiz-config";
import { describeDbError, prisma } from "@/lib/prisma";
import { quizConfigSchema } from "@/lib/quiz-config";

import { fail, parseBody, readJsonBody, requireAdmin } from "@/app/api/_lib/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const row = await prisma.quizConfig.findUnique({ where: { id: 1 }, select: { data: true } });
    return NextResponse.json({ ok: true, config: row?.data ?? DEFAULT_QUIZ_CONFIG });
  } catch (error) {
    console.error("[admin/quiz] не вдалося прочитати конфігурацію:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await readJsonBody(request);
  if (!body) return fail("Не вдалося прочитати дані", 400);

  // Схема перевіряє не лише типи, а й цілісність воронки: наявність усіх
  // кроків, унікальність кодів варіантів і обов'язкові ваги калькулятора.
  const parsed = parseBody(quizConfigSchema, body);
  if (!parsed.ok) return parsed.response;

  try {
    const row = await prisma.quizConfig.upsert({
      where: { id: 1 },
      update: { data: parsed.data },
      create: { id: 1, data: parsed.data },
    });

    revalidatePath("/");
    return NextResponse.json({ ok: true, config: row.data });
  } catch (error) {
    console.error("[admin/quiz] не вдалося зберегти конфігурацію:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}
