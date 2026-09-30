/**
 * Схеми валідації (zod).
 *
 * Одна схема на кожен вхідний payload — і для API-роутів, і (частково)
 * для клієнтських форм. Тому повідомлення про помилки одразу українською:
 * їх показують користувачеві як є.
 */

import { z } from "zod";
import { normalizeUaPhone } from "./phone";

// ------------------------------------------------------------------ примітиви

/** Ім'я: 2–60 символів, без службових символів. */
export const nameField = z
  .string()
  .trim()
  .min(2, "Вкажіть ім'я — мінімум 2 символи")
  .max(60, "Ім'я занадто довге")
  .refine((value) => !/[<>{}\\]/.test(value), "Ім'я містить неприпустимі символи");

/**
 * Телефон. На виході — канонічний `+380XXXXXXXXX`, тому в базу
 * ніколи не потрапляє «як ввели».
 */
export const phoneField = z
  .string()
  .trim()
  .min(1, "Вкажіть номер телефону")
  .transform((value, ctx) => {
    const normalized = normalizeUaPhone(value);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Невірний формат номера. Приклад: +380 67 887 33 33",
      });
      return z.NEVER;
    }
    return normalized;
  });

/**
 * Дата заходу: `YYYY-MM-DD` або порожньо.
 * Минулі дати відхиляємо — замовлення оформлення «на вчора» неможливе
 * (добова похибка лишається на часові пояси).
 */
export const eventDateField = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), "Невірна дата")
  .refine((value) => {
    if (!value) return true;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(today.getDate() - 1);
    return date >= today;
  }, "Дата не може бути в минулому");

/**
 * Приховане поле-пастка для ботів. Людина його не бачить і не заповнює,
 * тому будь-яке значення = спам.
 */
export const honeypotField = z.string().max(0, "Заявку відхилено").optional().default("");

/** Скільки мілісекунд користувач заповнював форму (бот — майже нуль). */
export const elapsedField = z.number().int().nonnegative().optional();

// ------------------------------------------------------------------- перелічення

export const holidayTypeEnum = z.enum([
  "BIRTHDAY",
  "KIDS",
  "GENDER_PARTY",
  "WEDDING",
  "CORPORATE",
  "MATERNITY",
]);

export const audienceEnum = z.enum(["BOY", "GIRL", "MAN", "WOMAN"]);

export const guestsEnum = z.enum(["UP_TO_10", "FROM_10_TO_20", "FROM_20_TO_50", "OVER_50"]);

export const budgetEnum = z.enum(["UP_TO_1000", "FROM_1000_TO_3000", "FROM_3000_TO_5000", "OVER_5000"]);

export const decorLevelEnum = z.enum(["ECONOMY", "STANDARD", "PREMIUM"]);

export const galleryCategoryEnum = z.enum(["BIRTHDAY", "WEDDING", "CORPORATE", "KIDS"]);

export const leadStatusEnum = z.enum(["NEW", "IN_PROGRESS", "DONE"]);

/** Спільні технічні поля, які заповнює клієнтський віджет аналітики. */
const trackingFields = {
  visitorId: z.string().trim().max(64).optional(),
  sessionId: z.string().trim().max(64).optional(),
  honeypot: honeypotField,
  elapsedMs: elapsedField,
};

// -------------------------------------------------------------- заявки (вхід)

/** Квіз-воронка: 6 кроків із брифу. */
export const quizLeadSchema = z.object({
  name: nameField,
  phone: phoneField,
  // HOLIDAY і GUESTS обов'язкові: ці кроки не можна вимкнути в /admin/quiz
  // (див. ALWAYS_ENABLED_STEP_KEYS), бо на них тримається калькулятор.
  holidayType: holidayTypeEnum,
  guests: guestsEnum,
  // AUDIENCE і BUDGET — необов'язкові: адміністратор може вимкнути ці кроки,
  // і тоді клієнт просто не надсилає відповідні поля. Якби вони лишались
  // обов'язковими, вимкнений крок робив би неможливим прийом заявок (400).
  audience: audienceEnum.optional(),
  budget: budgetEnum.optional(),
  eventDate: eventDateField,
  ...trackingFields,
});

/** Калькулятор вартості. */
export const calculatorLeadSchema = z.object({
  name: nameField,
  phone: phoneField,
  holidayType: holidayTypeEnum,
  guests: guestsEnum,
  guestsCount: z.number().int().positive().max(500).optional(),
  decorLevel: decorLevelEnum,
  delivery: z.boolean(),
  ...trackingFields,
});

/** Швидка форма в блоці контактів. */
export const contactLeadSchema = z.object({
  name: nameField,
  phone: phoneField,
  holidayType: holidayTypeEnum.optional(),
  comment: z.string().trim().max(600, "Коментар занадто довгий").optional(),
  ...trackingFields,
});

/** Перемикач «перейти в Telegram» — окремий лід, щоб бачити такі кліки. */
export const telegramClickSchema = z.object({
  name: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(30).optional(),
  comment: z.string().trim().max(300).optional(),
  ...trackingFields,
});

// --------------------------------------------------------------- аналітика

export const trackSchema = z.object({
  path: z.string().trim().min(1).max(300),
  referrer: z.string().trim().max(600).optional(),
  sessionId: z.string().trim().max(64).optional(),
  /** Назва події; якщо не вказана — це перегляд сторінки. */
  event: z.string().trim().max(60).optional(),
  meta: z.record(z.unknown()).optional(),
});

// --------------------------------------------------------------- авторизація

export const loginSchema = z.object({
  login: z.string().trim().min(1, "Вкажіть логін").max(120),
  password: z.string().min(1, "Вкажіть пароль").max(200),
});

// ------------------------------------------------------------- адмінка: CRUD

export const leadUpdateSchema = z.object({
  status: leadStatusEnum.optional(),
  adminNote: z.string().trim().max(1000).optional(),
});

export const galleryItemCreateSchema = z.object({
  title: z.string().trim().min(2, "Вкажіть назву").max(120),
  description: z.string().trim().max(300).optional(),
  category: galleryCategoryEnum,
  imageUrl: z.string().trim().min(1, "Додайте фото").max(500),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isPublished: z.boolean().optional(),
});

export const galleryItemUpdateSchema = galleryItemCreateSchema.partial();

export const testimonialCreateSchema = z.object({
  name: z.string().trim().min(2, "Вкажіть ім'я").max(80),
  text: z.string().trim().min(10, "Відгук занадто короткий").max(1000),
  photoUrl: z.string().trim().max(500).optional(),
  rating: z.number().int().min(1, "Оцінка від 1 до 5").max(5, "Оцінка від 1 до 5").optional(),
  eventType: z.string().trim().max(60).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isPublished: z.boolean().optional(),
});

export const testimonialUpdateSchema = testimonialCreateSchema.partial();

export const packageUpdateSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  priceFrom: z.number().int().min(0).max(1_000_000).optional(),
  description: z.string().trim().min(10).max(600).optional(),
  features: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isPublished: z.boolean().optional(),
});

export const settingsUpdateSchema = z.object({
  phone: z.string().trim().min(5, "Вкажіть телефон").max(30),
  telegram: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "")),
  instagram: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")),
  address: z.string().trim().min(5, "Вкажіть адресу").max(200),
  mapEmbedUrl: z.string().trim().max(1000).optional(),
  workingHours: z.string().trim().min(3, "Вкажіть графік роботи").max(120),
  discountPercent: z.number().int().min(0).max(90),
});

// --------------------------------------------------------------------- helpers

/**
 * Витягує перше повідомлення про помилку у вигляді, придатному для
 * показу користувачеві, плюс помилки по конкретних полях.
 */
export function formatZodError(error: z.ZodError): {
  message: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = error.issues[0]?.message ?? "Перевірте правильність заповнення форми";
  return { message: first, fields };
}

export type QuizLeadInput = z.infer<typeof quizLeadSchema>;
export type CalculatorLeadInput = z.infer<typeof calculatorLeadSchema>;
export type ContactLeadInput = z.infer<typeof contactLeadSchema>;
export type TrackInput = z.infer<typeof trackSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
