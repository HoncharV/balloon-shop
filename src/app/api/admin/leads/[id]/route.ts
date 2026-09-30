/**
 * Одна заявка: зміна статусу й нотатки адміністратора + видалення.
 *
 * `P2025` від Prisma означає «запису з таким id немає» — для клієнта це
 * 404, а не 500: адмінка часто тримає відкритою вкладку зі старою
 * заявкою, яку хтось уже видалив.
 */

import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { describeDbError, prisma } from "@/lib/prisma";
import { leadUpdateSchema } from "@/lib/validations";

import { fail, isNotFound, parseBody, readJsonBody, requireAdmin } from "@/app/api/_lib/http";
import { toLeadView } from "@/app/api/_lib/serialize";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  const body = await readJsonBody(request);
  if (!body) return fail("Не вдалося прочитати дані", 400);

  const parsed = parseBody(leadUpdateSchema, body);
  if (!parsed.ok) return parsed.response;

  try {
    const lead = await prisma.lead.update({ where: { id }, data: parsed.data });
    // Лендінг кешується (ISR) — скидаємо кеш разом з рештою мутацій адмінки.
    revalidatePath("/");
    return NextResponse.json({ ok: true, lead: toLeadView(lead) });
  } catch (error) {
    if (isNotFound(error)) return fail("Заявку не знайдено", 404);
    console.error("[admin/leads] не вдалося оновити заявку:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await prisma.lead.delete({ where: { id } });
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isNotFound(error)) return fail("Заявку не знайдено", 404);
    console.error("[admin/leads] не вдалося видалити заявку:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}
