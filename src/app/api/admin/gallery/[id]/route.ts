/**
 * Один запис галереї: редагування й видалення.
 *
 * Після кожної успішної зміни скидаємо кеш лендінга — інакше
 * відвідувач бачив би старе фото до наступної регенерації.
 */

import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { describeDbError, prisma } from "@/lib/prisma";
import { galleryItemUpdateSchema } from "@/lib/validations";

import { fail, isNotFound, parseBody, readJsonBody, requireAdmin } from "@/app/api/_lib/http";
import { toGalleryView } from "@/app/api/_lib/serialize";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  const body = await readJsonBody(request);
  if (!body) return fail("Не вдалося прочитати дані", 400);

  const parsed = parseBody(galleryItemUpdateSchema, body);
  if (!parsed.ok) return parsed.response;

  try {
    const item = await prisma.galleryItem.update({ where: { id }, data: parsed.data });
    revalidatePath("/");
    return NextResponse.json({ ok: true, item: toGalleryView(item) });
  } catch (error) {
    if (isNotFound(error)) return fail("Запис галереї не знайдено", 404);
    console.error("[admin/gallery] не вдалося оновити запис:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await prisma.galleryItem.delete({ where: { id } });
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isNotFound(error)) return fail("Запис галереї не знайдено", 404);
    console.error("[admin/gallery] не вдалося видалити запис:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}
