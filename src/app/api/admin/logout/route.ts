/**
 * Вихід з адмінки: просто стирає підписану cookie.
 *
 * Стан сесії живе лише в cookie, тому серверу нічого прибирати —
 * жодних записів у базі чи в памʼяті.
 */

import { NextResponse } from "next/server";

import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", adminCookieOptions(0));
  return response;
}
