/**
 * Побудова посилань із налаштувань сайту.
 *
 * Окремий модуль (а не частина `content.ts`), бо ці функції потрібні
 * і в клієнтських компонентах — а `content.ts` тягне Prisma Client і
 * не має потрапляти в браузерний бандл.
 *
 * Чисті функції: жодних залежностей, жодних звернень до мережі.
 */

import { phoneHref } from "./phone";

/** Мінімум полів, потрібний для побудови посилань. */
export type LinkableSettings = {
  phone: string;
  telegram: string;
  instagram: string;
  address: string;
  mapEmbedUrl?: string | null;
};

/** Чат у Telegram. `text` підставляє готове повідомлення. */
export function telegramUrl(settings: LinkableSettings, text?: string): string {
  const handle = (settings.telegram ?? "").replace(/^@/, "").trim();
  const base = handle ? `https://t.me/${handle}` : "https://t.me";
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Профіль в Instagram. */
export function instagramUrl(settings: LinkableSettings): string {
  const handle = (settings.instagram ?? "").replace(/^@/, "").trim();
  return handle ? `https://instagram.com/${handle}` : "https://instagram.com";
}

/** Значення для `href="tel:…"`. */
export function telHref(settings: LinkableSettings): string {
  return phoneHref(settings.phone);
}

/**
 * URL вбудованої карти. Якщо адміністратор не вказав власний
 * `mapEmbedUrl`, збираємо безкоштовний embed Google Maps за адресою
 * (працює без API-ключа).
 */
export function mapEmbedUrl(settings: LinkableSettings): string {
  if (settings.mapEmbedUrl) return settings.mapEmbedUrl;
  return `https://www.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed&hl=uk`;
}

/** Посилання «прокласти маршрут». */
export function mapsLink(settings: LinkableSettings): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;
}

/**
 * Готове повідомлення для Telegram — щоб клієнт не писав «добрий день»,
 * а одразу надсилав те, що потрібно менеджеру.
 */
export function telegramLeadMessage(name?: string): string {
  const who = name?.trim() ? `Мене звати ${name.trim()}.` : "";
  return `Вітаю! ${who} Хочу замовити оформлення кульками.`.replace(/\s+/g, " ").trim();
}
