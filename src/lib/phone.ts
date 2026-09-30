/**
 * Нормалізація українських телефонів.
 *
 * Користувачі вводять номер як завгодно: `067 887 33 33`,
 * `+38 (067) 887-33-33`, `380678873333`, `0678873333`. Для пошуку
 * дублікатів і для Telegram-повідомлень потрібна одна канонічна форма.
 *
 * Канонічна форма: `+380XXXXXXXXX` (12 цифр з плюсом).
 */

const UA_COUNTRY_CODE = "380";

/**
 * Повертає `+380XXXXXXXXX` або `null`, якщо номер не схожий на
 * український. Навмисно без зовнішніх залежностей — ця функція
 * виконується і на сервері, і в браузері.
 */
export function normalizeUaPhone(raw: string): string | null {
  if (!raw) return null;

  // Лишаємо тільки цифри та провідний «+»
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let national: string;

  if (digits.startsWith(UA_COUNTRY_CODE)) {
    // 380XXXXXXXXX
    national = digits.slice(UA_COUNTRY_CODE.length);
  } else if (digits.startsWith("0")) {
    // 0XXXXXXXXX
    national = digits.slice(1);
  } else if (digits.length === 9) {
    // XXXXXXXXX без нуля
    national = digits;
  } else {
    return null;
  }

  if (national.length !== 9) return null;

  // Перша цифра національного номера: 3–9 (мобільні 39/50/63/66/67/68/73/75/77/89/9x,
  // міські на кшталт 44 для Києва). 0/1/2 не буває.
  if (!/^[3-9]/.test(national)) return null;

  return `+${UA_COUNTRY_CODE}${national}`;
}

/** `+380678873333` → `+380 67 887 33 33` — як показуємо в адмінці. */
export function formatUaPhone(raw: string): string {
  const normalized = normalizeUaPhone(raw);
  if (!normalized) return raw;
  const n = normalized.slice(4); // 678873333
  return `+380 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`;
}

/** Значення для `href="tel:…"`. */
export function phoneHref(raw: string): string {
  const normalized = normalizeUaPhone(raw);
  return `tel:${normalized ?? raw.replace(/[^\d+]/g, "")}`;
}

/**
 * Груба перевірка «це не сміття» для антиспаму: однакова цифра,
 * послідовність 123456789 тощо. Не замінює перевірку формату.
 */
export function looksLikeFakePhone(normalized: string): boolean {
  const n = normalized.replace(/\D/g, "").slice(3);
  if (/^(\d)\1{8}$/.test(n)) return true;
  if ("0123456789".includes(n) || "9876543210".includes(n)) return true;
  return false;
}
