/**
 * Сповіщення про заявки в Telegram.
 *
 * Ключове рішення: якщо токен не заданий або Telegram недоступний —
 * це НЕ помилка заявки. Лід усе одно зберігається в базі, а застосунок
 * лише пише попередження в лог. Інакше клієнт бачив би «помилку» там,
 * де насправді все прийнято.
 */

import { escapeHtml as telegramEscape } from "./html";

const TELEGRAM_API = "https://api.telegram.org";
const REQUEST_TIMEOUT_MS = 8_000;

export type TelegramResult = { ok: boolean; skipped?: boolean; error?: string };

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/**
 * Надсилає довільне повідомлення. Повертає результат замість
 * винятку — виклик завжди «безпечний».
 */
export async function sendTelegramMessage(text: string): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false, skipped: true, error: "Telegram не налаштований (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)" };
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, error: `Telegram відповів ${response.status}: ${body.slice(0, 300)}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Невідома помилка запиту до Telegram",
    };
  }
}

/** Поля заявки, які має сенс показати в повідомленні. */
export type LeadNotification = {
  name: string;
  phone: string;
  sourceLabel: string;
  holidayLabel?: string;
  budgetLabel?: string;
  guestsLabel?: string;
  decorLabel?: string;
  eventDate?: string | null;
  estimatedPrice?: number | null;
  recommendedBalloons?: number | null;
  recommendedPackageName?: string | null;
  delivery?: boolean | null;
  comment?: string | null;
};

/**
 * Формат із брифу:
 *
 *   🎈 Нова заявка
 *   Ім'я:
 *   Телефон:
 *   Свято:
 *   Бюджет:
 *
 * Порожні рядки не додаємо, щоб повідомлення лишалось читабельним
 * у мобільному Telegram.
 */
export async function notifyNewLead(lead: LeadNotification): Promise<TelegramResult> {
  const lines: string[] = ["🎈 <b>Нова заявка</b>", ""];

  lines.push(`<b>Ім'я:</b> ${telegramEscape(lead.name)}`);
  // Клікабельний номер — щоб можна було подзвонити одразу з Telegram.
  lines.push(`<b>Телефон:</b> <a href="tel:${telegramEscape(lead.phone)}">${telegramEscape(lead.phone)}</a>`);

  if (lead.holidayLabel) lines.push(`<b>Свято:</b> ${telegramEscape(lead.holidayLabel)}`);
  if (lead.budgetLabel) lines.push(`<b>Бюджет:</b> ${telegramEscape(lead.budgetLabel)}`);
  if (lead.guestsLabel) lines.push(`<b>Гостей:</b> ${telegramEscape(lead.guestsLabel)}`);
  if (lead.decorLabel) lines.push(`<b>Оформлення:</b> ${telegramEscape(lead.decorLabel)}`);
  if (lead.eventDate) lines.push(`<b>Дата:</b> ${telegramEscape(lead.eventDate)}`);
  if (typeof lead.delivery === "boolean") lines.push(`<b>Доставка:</b> ${lead.delivery ? "потрібна" : "не потрібна"}`);

  if (lead.estimatedPrice) {
    const extra = lead.recommendedBalloons ? ` (~${lead.recommendedBalloons} кульок)` : "";
    const pack = lead.recommendedPackageName ? ` · набір ${lead.recommendedPackageName}` : "";
    lines.push(`<b>Орієнтовно:</b> ${lead.estimatedPrice} грн${extra}${pack}`);
  }

  if (lead.comment) lines.push("", `<b>Коментар:</b> ${telegramEscape(lead.comment)}`);

  lines.push("", `<i>Джерело: ${telegramEscape(lead.sourceLabel)}</i>`);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && /^https?:\/\//.test(siteUrl)) {
    lines.push(`<a href="${telegramEscape(siteUrl.replace(/\/$/, ""))}/admin/leads">Відкрити в адмінці</a>`);
  }

  return sendTelegramMessage(lines.join("\n"));
}

/**
 * Сповіщення про заявку без бази даних — коли Postgres недоступний.
 * Текст явно про це попереджає, щоб лід не загубився непомітно.
 */
export async function notifyLeadWithoutDatabase(
  lead: LeadNotification & { rawPhone: string },
): Promise<TelegramResult> {
  const result = await notifyNewLead(lead);
  console.warn(
    "[lead] База даних недоступна — заявку НЕ збережено.",
    JSON.stringify({ ...lead, phone: lead.rawPhone }),
    result.ok ? "(надіслано в Telegram)" : `(Telegram теж не спрацював: ${result.error})`,
  );
  return result;
}
