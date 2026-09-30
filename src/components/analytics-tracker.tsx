"use client";

/**
 * Клієнтський лічильник відвідувань.
 *
 * Компонент нічого не рендерить (повертає `null`) — він лише надсилає
 * події на `/api/track`. Той самий модуль експортує `trackEvent`, яким
 * користуються кнопки лендінга (клік у Telegram, відкриття галереї тощо).
 *
 * Аналітика не має права ламати інтерфейс: усі помилки ковтаються,
 * запити «вистрілив і забув», утримуємо `keepalive`, щоб подія долетіла
 * навіть коли користувач одразу закриває сторінку.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
} from "@/lib/analytics";

const TRACK_ENDPOINT = "/api/track";

/** Глибина прокрутки, яку фіксуємо один раз за сесію. */
const SCROLL_MILESTONES: { ratio: number; event: string }[] = [
  { ratio: 0.5, event: "scroll_50" },
  { ratio: 0.9, event: "scroll_90" },
];

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Ідентифікатори відвідувача та сесії. Обидва cookie пише саме цей
 * віджет — більше їх ніхто не створює. Сесія ковзна: кожна подія
 * продовжує її на 30 хвилин.
 */
function ensureIdentity(): string {
  const visitorId = readCookie(VISITOR_COOKIE) ?? randomId();
  writeCookie(VISITOR_COOKIE, visitorId, VISITOR_COOKIE_MAX_AGE);

  const sessionId = readCookie(SESSION_COOKIE) ?? randomId();
  writeCookie(SESSION_COOKIE, sessionId, SESSION_COOKIE_MAX_AGE);

  return sessionId;
}

function sendTrack(payload: Record<string, unknown>): void {
  void fetch(TRACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

/** Надіслати довільну подію. Ніколи не кидає і не блокує інтерфейс. */
export function trackEvent(name: string, meta?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    sendTrack({
      path: window.location.pathname,
      referrer: document.referrer,
      sessionId: ensureIdentity(),
      event: name,
      meta,
    });
  } catch {
    /* аналітика мовчки пропускає збій */
  }
}

/** Зафіксувати перегляд сторінки (подія без назви). */
export function trackPageView(): void {
  if (typeof window === "undefined") return;
  try {
    sendTrack({
      path: window.location.pathname,
      referrer: document.referrer,
      sessionId: ensureIdentity(),
    });
  } catch {
    /* аналітика мовчки пропускає збій */
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView();
  }, [pathname]);

  useEffect(() => {
    const fired = new Set<string>();

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 1;

      for (const milestone of SCROLL_MILESTONES) {
        if (ratio >= milestone.ratio && !fired.has(milestone.event)) {
          fired.add(milestone.event);
          trackEvent(milestone.event);
        }
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
