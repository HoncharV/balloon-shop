/**
 * Один набір: редагування цін, опису, ознак «популярний» і публікації.
 *
 * Набори не створюються з адмінки: їх рівно три (START / STANDARD /
 * PREMIUM) і вони приходять із сіду, тому тут лише `PATCH`.
 */

import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { describeDbError, prisma } from "@/lib/prisma";
import { packageUpdateSchema } from "@/lib/validations";

import { fail, isNotFound, parseBody, readJsonBody, requireAdmin } from "@/app/api/_lib/http";
import { toPackageView } from "@/app/api/_lib/serialize";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  const body = await readJsonBody(request);
  if (!body) return fail("Не вдалося прочитати дані", 400);

  const parsed = parseBody(packageUpdateSchema, body);
  if (!parsed.ok) return parsed.response;

  try {
    const item = await prisma.package.update({ where: { id }, data: parsed.data });
    revalidatePath("/");
    return NextResponse.json({ ok: true, item: toPackageView(item) });
  } catch (error) {
    if (isNotFound(error)) return fail("Набір не знайдено", 404);
    console.error("[admin/packages] не вдалося оновити набір:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}
