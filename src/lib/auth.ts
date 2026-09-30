/**
 * Авторизація адмінки.
 *
 * Свідомо без NextAuth: одному адміністратору достатньо логіна й пароля
 * зі змінних середовища. Сесія — це підписана HMAC-SHA256 cookie,
 * тобто стан зберігати ніде не треба.
 *
 * Свідомо без middleware: Edge-runtime не має `node:crypto`, а тримати
 * дві різні реалізації підпису — джерело помилок. Захист стоїть у
 * серверному layout адмінки (`src/app/admin/(protected)/layout.tsx`)
 * і в кожному API-роуті, що змінює дані.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { httpOnlyCookieOptions } from "./cookies";

export const ADMIN_COOKIE = "bm_admin";

export type AdminSession = {
  login: string;
  /** Unix-час (секунди). */
  issuedAt: number;
  expiresAt: number;
};

function sessionTtlSeconds(): number {
  const hours = Number(process.env.ADMIN_SESSION_HOURS ?? "12");
  const safeHours = Number.isFinite(hours) && hours > 0 && hours <= 24 * 30 ? hours : 12;
  return Math.round(safeHours * 3600);
}

/**
 * Чи взагалі можна входити. Якщо ні — адмінка показує інструкцію,
 * а не «невірний пароль».
 */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_LOGIN &&
      process.env.ADMIN_PASSWORD &&
      process.env.AUTH_SECRET &&
      process.env.AUTH_SECRET.length >= 16,
  );
}

function authSecret(): string {
  return process.env.AUTH_SECRET ?? "insecure-development-secret";
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * Порівняння без витоку довжини й часу: спершу обидва значення
 * згортаються в SHA-256, тому `timingSafeEqual` завжди отримує
 * буфери однакової довжини.
 */
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a, "utf8").digest();
  const digestB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(digestA, digestB);
}

function sign(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

/** Перевірка логіна й пароля зі змінних середовища. */
export function verifyCredentials(login: string, password: string): boolean {
  const expectedLogin = process.env.ADMIN_LOGIN;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedLogin || !expectedPassword) return false;
  // Обидві перевірки виконуються завжди — щоб за часом відповіді
  // не можна було зрозуміти, що саме вгадали.
  const loginOk = safeEqual(login, expectedLogin);
  const passwordOk = safeEqual(password, expectedPassword);
  return loginOk && passwordOk;
}

export function createSessionToken(login: string): { token: string; maxAge: number } {
  const maxAge = sessionTtlSeconds();
  const issuedAt = Math.floor(Date.now() / 1000);
  const session: AdminSession = { login, issuedAt, expiresAt: issuedAt + maxAge };
  const payload = base64url(JSON.stringify(session));
  return { token: `${payload}.${sign(payload)}`, maxAge };
}

/** Повертає сесію або `null`, якщо cookie відсутня / підпис невірний / прострочена. */
export function verifySessionToken(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (!session?.login || typeof session.expiresAt !== "number") return null;
    if (session.expiresAt * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** Сесія поточного запиту (для серверних компонентів і layout'ів). */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

/**
 * Cookie сесії адміністратора.
 * Прапорець `Secure` визначає `shouldUseSecureCookies()` — див. `src/lib/cookies.ts`
 * про те, чому це не можна робити через `NODE_ENV`.
 */
export function adminCookieOptions(maxAge: number) {
  return httpOnlyCookieOptions(maxAge);
}
