/**
 * Довідники та підписи.
 *
 * Один файл на весь застосунок: квіз, калькулятор і адмінка мусять
 * показувати ті самі варіанти й ті самі українські назви. Порядок
 * елементів у масивах = порядок кроків квіза з брифу.
 *
 * Значення (`value`) — рядкові літерали, що збігаються з enum'ами
 * у `prisma/schema.prisma`. Не перейменовуйте їх без міграції.
 */

export type LeadSourceKey = "QUIZ" | "CALCULATOR" | "CONTACT" | "TELEGRAM";
export type LeadStatusKey = "NEW" | "IN_PROGRESS" | "DONE";
export type AudienceKey = "BOY" | "GIRL" | "MAN" | "WOMAN";
export type GuestsKey = "UP_TO_10" | "FROM_10_TO_20" | "FROM_20_TO_50" | "OVER_50";
export type BudgetKey = "UP_TO_1000" | "FROM_1000_TO_3000" | "FROM_3000_TO_5000" | "OVER_5000";
export type DecorLevelKey = "ECONOMY" | "STANDARD" | "PREMIUM";
export type TrafficSourceKey =
  | "DIRECT"
  | "TELEGRAM"
  | "INSTAGRAM"
  | "GOOGLE"
  | "FACEBOOK"
  | "TIKTOK"
  | "VIBER"
  | "YOUTUBE"
  | "REFERRAL"
  | "OTHER";

/**
 * `HolidayTypeKey` живе в `src/data/site-content.ts` (той файл читає і сід),
 * тут лише реекспорт — щоб у проєкті було рівно одне визначення цього union.
 */
import type { HolidayTypeKey } from "@/data/site-content";
export type { HolidayTypeKey };

// ------------------------------------------------------------------ підписи
export const LEAD_STATUS_LABELS: Record<LeadStatusKey, string> = {
  NEW: "Новий",
  IN_PROGRESS: "В роботі",
  DONE: "Виконано",
};

export const LEAD_SOURCE_LABELS: Record<LeadSourceKey, string> = {
  QUIZ: "Квіз",
  CALCULATOR: "Калькулятор",
  CONTACT: "Форма контактів",
  TELEGRAM: "Telegram",
};

export const TRAFFIC_SOURCE_LABELS: Record<TrafficSourceKey, string> = {
  DIRECT: "Прямий захід",
  TELEGRAM: "Telegram",
  INSTAGRAM: "Instagram",
  GOOGLE: "Google",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  VIBER: "Viber",
  YOUTUBE: "YouTube",
  REFERRAL: "Переходи з сайтів",
  OTHER: "Інше",
};

export const GALLERY_CATEGORY_LABELS: Record<string, string> = {
  BIRTHDAY: "Дні народження",
  WEDDING: "Весілля",
  CORPORATE: "Корпоративи",
  KIDS: "Дитячі свята",
};

/** Порядок категорій у вкладках галереї. */
export const GALLERY_CATEGORY_ORDER = ["BIRTHDAY", "WEDDING", "CORPORATE", "KIDS"] as const;

// Підписи варіантів квіза (свято, для кого, гості, бюджет, оформлення) тут
// БІЛЬШЕ НЕ ЖИВУТЬ: вони редагуються в /admin/quiz і беруться з
// конфігурації через `resolveOptionLabel()` з `@/lib/quiz-config`.
// Дублювати їх тут означало б мати два джерела правди, які неминуче
// розійдуться після першої ж правки в адмінці.

export function labelOfStatus(value?: string | null): string {
  return LEAD_STATUS_LABELS[value as LeadStatusKey] ?? "—";
}

export function labelOfSource(value?: string | null): string {
  return LEAD_SOURCE_LABELS[value as LeadSourceKey] ?? "—";
}

/**
 * Назви подій аналітики. Тримаємо списком, щоб адмінка не показувала
 * сирі рядки й щоб друкарська помилка в одному місці була видимою.
 */
export const ANALYTICS_EVENTS = {
  QUIZ_VIEW: "quiz_view",
  QUIZ_START: "quiz_start",
  QUIZ_COMPLETE: "quiz_complete",
  CALCULATOR_OPEN: "calculator_open",
  CALCULATOR_SUBMIT: "calculator_submit",
  LEAD_SUBMIT: "lead_submit",
  TELEGRAM_CLICK: "telegram_click",
  PHONE_CLICK: "phone_click",
  GALLERY_OPEN: "gallery_open",
  PACKAGE_ORDER: "package_order",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const ANALYTICS_EVENT_LABELS: Record<string, string> = {
  quiz_view: "Перегляд квіза",
  quiz_start: "Початок квіза",
  quiz_complete: "Квіз пройдено до кінця",
  calculator_open: "Відкриття калькулятора",
  calculator_submit: "Розрахунок надіслано",
  lead_submit: "Заявка надіслана",
  telegram_click: "Клік у Telegram",
  phone_click: "Клік на телефон",
  gallery_open: "Перегляд фото",
  package_order: "Клік «Замовити» на наборі",
};
