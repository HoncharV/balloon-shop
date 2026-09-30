/**
 * Галерея «Наші роботи»: список для адмінки та створення.
 *
 * Тут повертаються й неопубліковані записи — адмінка мусить бачити все,
 * що є в базі, а фільтр `isPublished` належить публічному лендінгу.
 *
 * `revalidatePath("/")` після мутацій обовʼязковий: сторінка кешується
 * (ISR), і без нього правка в адмінці не зʼявиться на сайті.
 */

import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { describeDbError, prisma } from "@/lib/prisma";
import { galleryItemCreateSchema } from "@/lib/validations";

import { fail, parseBody, readJsonBody, requireAdmin } from "@/app/api/_lib/http";
import { toGalleryView } from "@/app/api/_lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const rows = await prisma.galleryItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const items = rows.map(toGalleryView);
    // `items` — основна назва; `gallery` лишається для сумісності з
    // клієнтом, який читає колекцію за назвою сутності.
    return NextResponse.json({ ok: true, items, gallery: items, total: items.length });
  } catch (error) {
    console.error("[admin/gallery] не вдалося прочитати галерею:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await readJsonBody(request);
  if (!body) return fail("Не вдалося прочитати дані", 400);

  const parsed = parseBody(galleryItemCreateSchema, body);
  if (!parsed.ok) return parsed.response;

  try {
    const created = await prisma.galleryItem.create({ data: parsed.data });
    revalidatePath("/");
    return NextResponse.json({ ok: true, item: toGalleryView(created) });
  } catch (error) {
    console.error("[admin/gallery] не вдалося створити запис:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}
