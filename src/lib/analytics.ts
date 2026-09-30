/**
 * Власний лічильник відвідувань (без Google Analytics).
 *
 * Як працює:
 *  1. клієнтський `<AnalyticsTracker />` один раз за сесію пише cookie
 *     `bm_vid` (рік) і `bm_sid` (30 хвилин);
 *  2. на кожен перехід він робить POST /api/track, який створює
 *     `PageView` та/або `AnalyticsEvent`;
 *  3. адмінка агрегує дані запитами до цих двох таблиць.
 *
 * Модуль навмисно без залежностей — використовується і на сервері
 * (роут, RSC), і в браузері.
 */

import type { TrafficSourceKey } from "./constants";

export const VISITOR_COOKIE = "bm_vid";
export const SESSION_COOKIE = "bm_sid";

export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // рік
export const SESSION_COOKIE_MAX_AGE = 60 * 30; // 30 хвилин

/**
 * Визначає джерело трафіку за `document.referrer`.
 *
 * Порядок перевірок важливий: спершу власні домени (це внутрішній
 * перехід, а не джерело), потім месенджери, далі пошук і соцмережі.
 */
export function detectTrafficSource(referrer?: string | null, utmSource?: string | null): TrafficSourceKey {
  const utm = utmSource?.toLowerCase().trim();
  if (utm) {
    if (utm.includes("telegram") || utm === "tg") return "TELEGRAM";
    if (utm.includes("instagram") || utm === "ig") return "INSTAGRAM";
    if (utm.includes("google")) return "GOOGLE";
    if (utm.includes("facebook") || utm === "fb") return "FACEBOOK";
    if (utm.includes("tiktok")) return "TIKTOK";
    if (utm.includes("viber")) return "VIBER";
    if (utm.includes("youtube")) return "YOUTUBE";
    return "OTHER";
  }

  if (!referrer) return "DIRECT";

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "OTHER";
  }

  // Внутрішні переходи не є джерелом трафіку
  const ownHosts = [process.env.NEXT_PUBLIC_SITE_URL, "localhost", "127.0.0.1"]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(String(value)).hostname.toLowerCase();
      } catch {
        return String(value).toLowerCase();
      }
    });
  if (ownHosts.some((own) => host === own || host.endsWith(`.${own}`))) return "DIRECT";

  if (host.includes("t.me") || host.includes("telegram")) return "TELEGRAM";
  if (host.includes("instagram")) return "INSTAGRAM";
  if (host.includes("facebook") || host.includes("fb.")) return "FACEBOOK";
  if (host.includes("tiktok")) return "TIKTOK";
  if (host.includes("viber")) return "VIBER";
  if (host.includes("youtube") || host.includes("youtu.be")) return "YOUTUBE";

  const searchEngines = ["google.", "bing.", "duckduckgo.", "uk.search.", "yahoo."];
  if (searchEngines.some((engine) => host.includes(engine))) return "GOOGLE";

  return "REFERRAL";
}

/** IP клієнта з заголовків проксі (Vercel/nginx) або `null`. */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return headers.get("x-real-ip");
}

/** Короткий опис пристрою для адмінки — повний user-agent там не потрібен. */
export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return "Невідомий пристрій";
  const ua = userAgent.toLowerCase();

  const device = ua.includes("ipad") || ua.includes("tablet")
    ? "Планшет"
    : ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")
      ? "Мобільний"
      : "Комп'ютер";

  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome") || ua.includes("crios")
      ? "Chrome"
      : ua.includes("firefox") || ua.includes("fxios")
        ? "Firefox"
        : ua.includes("safari")
          ? "Safari"
          : "Інший браузер";

  return `${device} · ${browser}`;
}

/** Формати, у яких адмінка показує аналітику. */
export type AnalyticsRange = "today" | "7d" | "30d" | "all";

export type CountedRow = {
  key: string;
  count: number;
};

export type AnalyticsSummary = {
  visitorsToday: number;
  pageViewsToday: number;
  visitors7d: number;
  pageViews7d: number;
  visitors30d: number;
  pageViews30d: number;
  visitorsTotal: number;
  pageViewsTotal: number;
  leadsToday: number;
  leads7d: number;
  leads30d: number;
  leadsTotal: number;
  /** Відсоток відвідувачів, які лишили заявку (за весь час). */
  conversion: number;
  sources: CountedRow[];
  topPages: CountedRow[];
  events: CountedRow[];
  daily: { date: string; visitors: number; pageViews: number; leads: number }[];
};

export function percentage(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}
