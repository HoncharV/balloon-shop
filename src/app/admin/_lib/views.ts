/**
 * Перетворення рядків Prisma у форми, безпечні для клієнтських компонентів.
 *
 * Навіщо окремий модуль: заявка має понад двадцять полів, і ту саму
 * конверсію роблять і дашборд, і сторінка «Заявки». Дати мусять стати
 * ISO-рядками (RSC передає `Date` у клієнт як `Date`, а `eventDate`
 * зберігається як `@db.Date` — його треба віддати календарним
 * `YYYY-MM-DD`, інакше часовий пояс зсунув би дату на день назад).
 *
 * Папка `_lib` не стає маршрутом. Модуль серверний: імпортує типи Prisma,
 * тому його не можна тягнути в клієнтські компоненти.
 */

import type { Lead } from "@prisma/client";

import type { LeadView } from "@/types/site";

/** Календарна дата `YYYY-MM-DD` для поля `eventDate`. */
function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

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
