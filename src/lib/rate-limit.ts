/**
 * Найпростіший антиспам: обмеження частоти запитів у пам'яті процесу.
 *
 * Свідоме обмеження: лічильники живуть у пам'яті Node-процесу, тому
 * на кількох інстансах (або після перезапуску) вони скидаються. Для
 * лендінга одного магазину цього достатньо; якщо з'явиться кілька
 * реплік — замініть реалізацію на Redis, інтерфейс не зміниться.
 *
 * Додатково є honeypot-поле та перевірка «занадто швидкої» відправки
 * (див. `src/lib/validations.ts` і API-роут заявок) — разом це
 * відсіює переважну більшість ботів.
 */

type Bucket = {
  count: number;
  /** Unix-час (мс), коли вікно скидається. */
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Прибирає прострочені вікна, щоб Map не ріс безмежно. */
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Скільки спроб лишилось у поточному вікні. */
  remaining: number;
  /** Через скільки секунд можна повторити (0, якщо не заблоковано). */
  retryAfterSeconds: number;
};

/**
 * Фіксоване вікно: `limit` спроб на `windowSeconds` секунд для ключа.
 *
 * @example
 *   const limit = rateLimit(`lead:${ip}`, 5, 600); // 5 заявок за 10 хв
 *   if (!limit.ok) return NextResponse.json({ ... }, { status: 429 });
 */
export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** Обмеження за IP клієнта. `scope` розділяє ліміти різних ендпоінтів. */
export function rateLimitByIp(
  headers: Headers,
  scope: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown";
  return rateLimit(`${scope}:${ip}`, limit, windowSeconds);
}
