/**
 * Вхід в адмінку.
 *
 * Перевірка така сама, як і в решті адмінських роутів, тому тут її
 * немає: розлогіненому користувачеві просто нема чого робити. Зате є
 * обмеження частоти — без нього пароль можна підбирати перебором.
 */

import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, adminCookieOptions, createSessionToken, isAuthConfigured, verifyCredentials } from "@/lib/auth";
import { rateLimitByIp } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";

import { fail, failRetryAfter, parseBody, readJsonBody } from "@/app/api/_lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const limit = rateLimitByIp(request.headers, "login", 8, 600);
    if (!limit.ok) {
      return failRetryAfter(
        "Занадто багато спроб входу. Спробуйте, будь ласка, за кілька хвилин.",
        limit.retryAfterSeconds,
      );
    }

    // Краще сказати прямо, чого не хватає, ніж показувати «невірний пароль»
    // там, де адмінка взагалі не налаштована.
    if (!isAuthConfigured()) {
      return fail(
        "Вхід не налаштований. Заповніть у файлі .env змінні ADMIN_LOGIN, ADMIN_PASSWORD і AUTH_SECRET (мінімум 16 символів).",
        500,
      );
    }

    const body = await readJsonBody(request);
    if (!body) return fail("Не вдалося прочитати дані форми", 400);

    const parsed = parseBody(loginSchema, body);
    if (!parsed.ok) return parsed.response;

    const { login, password } = parsed.data;
    if (!verifyCredentials(login, password)) {
      // Без підказок, що саме хибне — логін чи пароль.
      return fail("Невірний логін або пароль", 401);
    }

    const { token, maxAge } = createSessionToken(login);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, token, adminCookieOptions(maxAge));
    return response;
  } catch (error) {
    console.error("[admin/login] непередбачена помилка:", error);
    return fail("Сталася помилка входу. Спробуйте, будь ласка, ще раз.", 500);
  }
}
