/**
 * Перетворення рядків Prisma у форми, безпечні для віддачі клієнту.
 *
 * Навіщо окремо: `Date` серіалізується у ISO, а `eventDate` зберігається
 * як `@db.Date` і адмінці потрібен саме календарний `YYYY-MM-DD`, інакше
 * зсув часового поясу показував би «на день раніше». Явні конвертери
 * роблять це однаково в кожному роуті.
 */

import type { GalleryItem, Lead, Package, Prisma, Testimonial } from "@prisma/client";

import type { GalleryView, LeadView, PackageView, TestimonialView } from "@/types/site";

/** Календарна дата `YYYY-MM-DD` — формат поля `eventDate`. */
function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** Заявка для адмінки: дати — рядки, enum'и — звичайні рядки. */
export function toLeadView(lead: Lead): LeadView {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    source: lead.source,
    status: lead.status,
    holidayType: lead.holidayType,
    audience: lead.audience,
    guests: lead.guests,
    budget: lead.budget,
    decorLevel: lead.decorLevel,
    delivery: lead.delivery,
    eventDate: toDateOnly(lead.eventDate),
    guestsCount: lead.guestsCount,
    recommendedBalloons: lead.recommendedBalloons,
    estimatedPrice: lead.estimatedPrice,
    recommendedPackage: lead.recommendedPackage,
    comment: lead.comment,
    adminNote: lead.adminNote,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

/** Записи галереї в адмінці показуються разом із неопублікованими. */
export type GalleryAdminView = GalleryView & {
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toGalleryView(item: GalleryItem): GalleryAdminView {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    category: item.category,
    imageUrl: item.imageUrl,
    sortOrder: item.sortOrder,
    isPublished: item.isPublished,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export type TestimonialAdminView = TestimonialView & {
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toTestimonialView(item: Testimonial): TestimonialAdminView {
  return {
    id: item.id,
    name: item.name,
    photoUrl: item.photoUrl,
    text: item.text,
    rating: item.rating,
    eventType: item.eventType ?? "",
    sortOrder: item.sortOrder,
    isPublished: item.isPublished,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export type PackageAdminView = PackageView & {
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toPackageView(item: Package): PackageAdminView {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    priceFrom: item.priceFrom,
    description: item.description,
    features: item.features,
    imageUrl: item.imageUrl ?? "",
    isPopular: item.isPopular,
    sortOrder: item.sortOrder,
    isPublished: item.isPublished,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

/**
 * Приводить довільне значення з JSON-тіла до типу, який приймає Prisma
 * для полів `Json`. Значення вже пройшло `JSON.parse`, тому робота тут
 * лише типізаційна: відсіюються `undefined` і не-скінченні числа.
 */
export function toJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((item) => toJsonValue(item));
  if (typeof value === "object") {
    const result: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      result[key] = toJsonValue(item);
    }
    return result;
  }
  return null;
}

/**
 * Копія об'єкта без вказаних ключів — для збереження відповідей квіза
 * у `quizAnswers` (там не потрібні honeypot і час заповнення).
 */
export function omitKeys(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!keys.includes(key)) result[key] = value;
  }
  return result;
}
