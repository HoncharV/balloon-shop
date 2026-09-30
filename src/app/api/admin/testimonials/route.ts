/**
 * Відгуки: список для адмінки та створення.
 *
 * Повертаються всі записи, разом із неопублікованими — публічний
 * лендінг фільтрує їх сам.
 */

import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { describeDbError, prisma } from "@/lib/prisma";
import { testimonialCreateSchema } from "@/lib/validations";

import { fail, parseBody, readJsonBody, requireAdmin } from "@/app/api/_lib/http";
import { toTestimonialView } from "@/app/api/_lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const rows = await prisma.testimonial.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const items = rows.map(toTestimonialView);
    return NextResponse.json({ ok: true, items, testimonials: items, total: items.length });
  } catch (error) {
    console.error("[admin/testimonials] не вдалося прочитати відгуки:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await readJsonBody(request);
  if (!body) return fail("Не вдалося прочитати дані", 400);

  const parsed = parseBody(testimonialCreateSchema, body);
  if (!parsed.ok) return parsed.response;

  try {
    const created = await prisma.testimonial.create({ data: parsed.data });
    revalidatePath("/");
    return NextResponse.json({ ok: true, item: toTestimonialView(created) });
  } catch (error) {
    console.error("[admin/testimonials] не вдалося створити відгук:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}
