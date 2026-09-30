/**
 * Перевірка стану застосунку.
 *
 * Цей самий шлях використовує `HEALTHCHECK` у Dockerfile, тому
 * відповідь мусить бути швидкою і без побічних ефектів: якщо база
 * недоступна — 503, щоб оркестратор знав, що контейнер не готовий.
 */

import { NextResponse } from "next/server";

import { checkDatabase, describeDbError, isDatabaseConfigured } from "@/lib/prisma";
import { isTelegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const telegram = isTelegramConfigured();
  try {
    const database = await checkDatabase();
    return NextResponse.json(
      { ok: database.ok, database, telegram, time: new Date().toISOString() },
      { status: database.ok ? 200 : 503 },
    );
  } catch (error) {
    console.error("[health] перевірка бази не вдалась:", error);
    return NextResponse.json(
      {
        ok: false,
        database: { ok: false, configured: isDatabaseConfigured, message: describeDbError(error) },
        telegram,
        time: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
