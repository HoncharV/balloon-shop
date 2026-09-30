/**
 * Лічильник відвідувань і подій — власна аналітика без зовнішніх сервісів.
 *
 * Ключове правило: **цей роут ніколи не повертає помилку через
 * недоступну базу**. Трекінг — фоновий побічний ефект; якщо він ламає
 * сторінку, краще втратити статистику, ніж лід.
 *
 * Cookie: `bm_vid` (рік) — унікальний відвідувач, `bm_sid` (30 хв) —
 * сесія. Обидві ставляться на відповіді, бо роут має доступ до
 * `NextResponse.cookies`.
 */

import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { httpOnlyCookieOptions } from "@/lib/cookies";

import {
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
  detectTrafficSource,
} from "@/lib/analytics";
import { describeDbError, prisma } from "@/lib/prisma";
import { rateLimitByIp } from "@/lib/rate-limit";
import { trackSchema } from "@/lib/validations";

import { fail, failRetryAfter, parseBody, readJsonBody } from "@/app/api/_lib/http";
import { toJsonValue } from "@/app/api/_lib/serialize";

export const dynamic = "force-dynamic";

/**
 * Дістає `utm_source` з URL. `base` потрібен, щоб приймати і повний
 * URL, і звичайний шлях (`/?utm_source=tg`).
 */
function readUtmSource(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value, "http://localhost").searchParams.get("utm_source");
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  // Спільні налаштування: прапорець `Secure` залежить від публічної адреси
  // сайту, а не від NODE_ENV (див. src/lib/cookies.ts).
  return httpOnlyCookieOptions(maxAge);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limit = rateLimitByIp(request.headers, "track", 120, 60);
  if (!limit.ok) {
    return failRetryAfter("Занадто багато запитів", limit.retryAfterSeconds);
  }

  const body = await readJsonBody(request);
  if (!body) return fail("Невалідне тіло запиту", 400);

  const parsed = parseBody(trackSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const existingVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitorId ?? randomUUID();

  const cookieSessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = data.sessionId ?? cookieSessionId ?? randomUUID();

  const referrer = data.referrer ?? null;
  // `utm_source` найчастіше стоїть у поточному URL, а не в referrer,
  // тому перевіряємо обидва — джерело трафіку важливе для звітів.
  const source = detectTrafficSource(referrer, readUtmSource(referrer) ?? readUtmSource(data.path));
  const userAgent = request.headers.get("user-agent");

  try {
    await prisma.visitor.upsert({
      where: { visitorId },
      update: { lastSeenAt: new Date(), pageViews: { increment: 1 } },
      create: {
        visitorId,
        lastSeenAt: new Date(),
        userAgent,
        referrer,
        source,
        pageViews: 1,
      },
    });

    if (data.event) {
      // Подія НЕ створює перегляд: інакше статистика переглядів
      // роздується на кожен клік у галереї.
      const meta = data.meta ? toJsonValue(data.meta) : null;
      await prisma.analyticsEvent.create({
        data: {
          name: data.event,
          visitorId,
          sessionId,
          path: data.path,
          ...(meta ? { meta } : {}),
        },
      });
    } else {
      await prisma.pageView.create({
        data: { visitorId, sessionId, path: data.path, referrer, source, userAgent },
      });
    }
  } catch (error) {
    // Свідомо не повертаємо помилку: сторінка не має залежати від бази.
    console.warn("[track] статистику не збережено:", describeDbError(error));
  }

  const response = NextResponse.json({ ok: true });
  if (!existingVisitorId) response.cookies.set(VISITOR_COOKIE, visitorId, cookieOptions(VISITOR_COOKIE_MAX_AGE));
  if (!data.sessionId && !cookieSessionId) {
    response.cookies.set(SESSION_COOKIE, sessionId, cookieOptions(SESSION_COOKIE_MAX_AGE));
  }
  return response;
}
