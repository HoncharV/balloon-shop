/**
 * Зріз аналітики для дашборда адмінки.
 *
 * Якщо база недоступна, повертаємо порожній зріз зі статусом 200 і
 * ознакою `degraded` — дашборд мусить малюватись завжди, а «нулі»
 * чесніше показувати як «даних немає», ніж падати з 500.
 */

import { NextResponse } from "next/server";

import { emptyAnalyticsSummary, getAnalyticsSummary } from "@/lib/analytics-queries";
import { describeDbError } from "@/lib/prisma";

import { requireAdmin } from "@/app/api/_lib/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const summary = await getAnalyticsSummary();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.warn("[admin/analytics] база недоступна, віддаю порожній зріз:", describeDbError(error));
    return NextResponse.json({ ok: true, ...emptyAnalyticsSummary(), degraded: true });
  }
}
