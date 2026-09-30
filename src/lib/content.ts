/**
 * Читання контенту для публічних сторінок.
 *
 * ГОЛОВНЕ ПРАВИЛО: жодна з цих функцій не кидає виняток і ніколи не
 * повертає порожній результат. Якщо база недоступна або таблиці ще
 * порожні — повертаються дані з `src/data/site-content.ts`.
 *
 * Завдяки цьому `npm install && npm run dev` показує повноцінний лендінг
 * ще до того, як піднято PostgreSQL, а SEO-краулери ніколи не бачать
 * порожню сторінку.
 *
 * ⚠️ Серверний модуль (імпортує Prisma Client). Для посилань, які
 * потрібні в клієнтських компонентах, використовуйте `src/lib/links.ts`.
 */

import {
  DEFAULT_GALLERY,
  DEFAULT_PACKAGES,
  DEFAULT_SETTINGS,
  DEFAULT_TESTIMONIALS,
  type GalleryCategoryKey,
} from "@/data/site-content";
import { DEFAULT_QUIZ_CONFIG, type QuizConfigData } from "@/data/quiz-config";
import { prisma, readDb } from "./prisma";
import { normalizeQuizConfig } from "./quiz-config";
import type { GalleryView, PackageView, SettingsView, TestimonialView } from "@/types/site";

// Типи живуть у `@/types/site` (client-safe) і реекспортуються для зручності.
export type { GalleryView, PackageView, SettingsView, TestimonialView };

const SETTINGS_SELECT = {
  phone: true,
  telegram: true,
  instagram: true,
  address: true,
  mapEmbedUrl: true,
  workingHours: true,
  discountPercent: true,
} as const;

export async function getSiteSettings(): Promise<SettingsView> {
  const row = await readDb(() =>
    prisma.siteSettings.findUnique({ where: { id: 1 }, select: SETTINGS_SELECT }),
  );
  return row ?? DEFAULT_SETTINGS;
}

export async function getPackages(): Promise<PackageView[]> {
  const rows = await readDb(() =>
    prisma.package.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        priceFrom: true,
        description: true,
        features: true,
        imageUrl: true,
        isPopular: true,
        sortOrder: true,
      },
    }),
  );

  if (!rows || rows.length === 0) {
    return DEFAULT_PACKAGES.map((item) => ({ ...item, id: `default-${item.slug}` }));
  }

  return rows.map((row) => ({ ...row, imageUrl: row.imageUrl ?? "/images/packages/start.svg" }));
}

export async function getGallery(category?: GalleryCategoryKey | "ALL"): Promise<GalleryView[]> {
  const rows = await readDb(() =>
    prisma.galleryItem.findMany({
      where: {
        isPublished: true,
        ...(category && category !== "ALL" ? { category } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, description: true, category: true, imageUrl: true, sortOrder: true },
    }),
  );

  if (!rows || rows.length === 0) {
    return DEFAULT_GALLERY.filter((item) => !category || category === "ALL" || item.category === category).map(
      (item, index) => ({ ...item, id: `default-gallery-${index + 1}` }),
    );
  }

  return rows.map((row) => ({ ...row, description: row.description ?? "" }));
}

export async function getTestimonials(): Promise<TestimonialView[]> {
  const rows = await readDb(() =>
    prisma.testimonial.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, photoUrl: true, text: true, rating: true, eventType: true, sortOrder: true },
    }),
  );

  if (!rows || rows.length === 0) {
    return DEFAULT_TESTIMONIALS.map((item, index) => ({
      ...item,
      id: `default-testimonial-${index + 1}`,
    }));
  }

  return rows.map((row) => ({ ...row, eventType: row.eventType ?? "" }));
}

/**
 * Конфігурація квіза та ваг калькулятора.
 *
 * Якщо рядка в базі немає або він не проходить zod-схему — повертаються
 * типові значення з `src/data/quiz-config.ts`. Тобто редагування з адмінки
 * працює за принципом «останнє збережене перекриває типове», і лендінг
 * не ламається від некоректного конфіга.
 */
export async function getQuizConfig(): Promise<QuizConfigData> {
  const row = await readDb(() =>
    prisma.quizConfig.findUnique({ where: { id: 1 }, select: { data: true } }),
  );
  if (!row) return DEFAULT_QUIZ_CONFIG;
  return normalizeQuizConfig(row.data);
}
