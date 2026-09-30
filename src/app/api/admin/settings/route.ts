/**
 * Налаштування сайту — один рядок (id = 1).
 *
 * `upsert`, а не `update`: на чистій базі після `prisma db push` рядка
 * може ще не бути (сід не виконано), а адмінка мусить працювати.
 * `GET` не створює рядок — лише підставляє значення з
 * `src/data/site-content.ts`, щоб форма була заповнена.
 */

import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_SETTINGS } from "@/data/site-content";
import { describeDbError, prisma } from "@/lib/prisma";
import { settingsUpdateSchema } from "@/lib/validations";

import { fail, parseBody, readJsonBody, requireAdmin } from "@/app/api/_lib/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    return NextResponse.json({ ok: true, settings: settings ?? DEFAULT_SETTINGS });
  } catch (error) {
    console.error("[admin/settings] не вдалося прочитати налаштування:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await readJsonBody(request);
  if (!body) return fail("Не вдалося прочитати дані", 400);

  const parsed = parseBody(settingsUpdateSchema, body);
  if (!parsed.ok) return parsed.response;

  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: parsed.data,
      create: { id: 1, ...parsed.data },
    });
    revalidatePath("/");
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("[admin/settings] не вдалося зберегти налаштування:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}
