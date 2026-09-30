/**
 * Один відгук: редагування й видалення.
 */

import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { describeDbError, prisma } from "@/lib/prisma";
import { testimonialUpdateSchema } from "@/lib/validations";

import { fail, isNotFound, parseBody, readJsonBody, requireAdmin } from "@/app/api/_lib/http";
import { toTestimonialView } from "@/app/api/_lib/serialize";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  const body = await readJsonBody(request);
  if (!body) return fail("Не вдалося прочитати дані", 400);

  const parsed = parseBody(testimonialUpdateSchema, body);
  if (!parsed.ok) return parsed.response;

  try {
    const item = await prisma.testimonial.update({ where: { id }, data: parsed.data });
    revalidatePath("/");
    return NextResponse.json({ ok: true, item: toTestimonialView(item) });
  } catch (error) {
    if (isNotFound(error)) return fail("Відгук не знайдено", 404);
    console.error("[admin/testimonials] не вдалося оновити відгук:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await prisma.testimonial.delete({ where: { id } });
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isNotFound(error)) return fail("Відгук не знайдено", 404);
    console.error("[admin/testimonials] не вдалося видалити відгук:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}
