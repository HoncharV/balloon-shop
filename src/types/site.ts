/**
 * Типи даних, які переходять із сервера в клієнтські компоненти.
 *
 * Навіщо окремий файл: `src/lib/content.ts` імпортує Prisma Client.
 * Якщо клієнтський компонент напише `import type { SettingsView } from "@/lib/content"`,
 * це спрацює лише доти, доки хтось не забуде слово `type` — і тоді
 * Prisma потрапить у браузерний бандл. Тут такого ризику немає:
 * модуль залежить тільки від `src/data/site-content.ts`.
 *
 * Правило для клієнтських компонентів:
 *  · enum-значення беруть із `@/lib/constants`;
 *  · типи — звідси;
 *  · `@prisma/client` у клієнтському коді не імпортується НІКОЛИ.
 */

import type {
  GalleryContent,
  PackageContent,
  SiteSettingsContent,
  TestimonialContent,
} from "@/data/site-content";

export type SettingsView = SiteSettingsContent;
export type PackageView = PackageContent & { id: string };
export type GalleryView = GalleryContent & { id: string };
export type TestimonialView = TestimonialContent & { id: string };

/**
 * Заявка у вигляді, придатному для передачі в клієнтські компоненти:
 * дати — ISO-рядки, enum'и — звичайні рядки.
 */
export type LeadView = {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  holidayType: string | null;
  audience: string | null;
  guests: string | null;
  budget: string | null;
  decorLevel: string | null;
  delivery: boolean | null;
  eventDate: string | null;
  guestsCount: number | null;
  recommendedBalloons: number | null;
  estimatedPrice: number | null;
  recommendedPackage: string | null;
  comment: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Стан бази даних, який адмінка показує замість помилки 500. */
export type DatabaseStatus = {
  ok: boolean;
  configured: boolean;
  message: string;
};

/** Єдиний формат відповіді всіх POST-ендпоінтів заявок. */
export type LeadApiResponse = {
  ok: boolean;
  message?: string;
  /** Помилки по конкретних полях форми. */
  fields?: Record<string, string>;
  leadId?: string;
  /** Посилання в Telegram з підставленим текстом. */
  telegramUrl?: string;
  /** Результат розрахунку (лише для калькулятора). */
  quote?: {
    guestsCount: number;
    recommendedBalloons: number;
    estimatedPrice: number;
    priceMax: number;
    recommendedPackage: string;
    recommendedPackageName: string;
    deliveryFree: boolean;
  };
  /** Знижка, яку обіцяємо після квіза. */
  discountPercent?: number;
};
