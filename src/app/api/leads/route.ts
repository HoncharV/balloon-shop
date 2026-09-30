/**
 * Прийом заявок — єдина точка входу для всіх форм лендінга.
 *
 * Один ендпоінт замість трьох: одне обмеження частоти, одна валідація,
 * одне місце виклику Telegram і одна форма відповіді (`LeadApiResponse`).
 * Розрізняє форми дискримінатор `source`.
 *
 * Деградація без бази даних: якщо PostgreSQL недоступний, заявка все
 * одно йде в Telegram, а користувач бачить «прийнято» — показувати
 * помилку там, де заявка насправді дійшла, означало б втратити лід.
 */

import type { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { getClientIp } from "@/lib/analytics";
import { calculateQuote, type Quote } from "@/lib/calculator";
import {
  LEAD_SOURCE_LABELS,
  type AudienceKey,
  type BudgetKey,
  type DecorLevelKey,
  type GuestsKey,
  type LeadSourceKey,
} from "@/lib/constants";
// `HolidayTypeKey` живе у `@/data/site-content` — це клієнтсько-безпечний
// опис того самого перелічення, що й `HolidayType` у схемі Prisma.
import type { HolidayTypeKey } from "@/data/site-content";
import { getQuizConfig, getSiteSettings } from "@/lib/content";
import { telegramLeadMessage, telegramUrl } from "@/lib/links";
import { looksLikeFakePhone } from "@/lib/phone";
import { pricingFromConfig, resolveOptionLabel, type PricingConfig } from "@/lib/quiz-config";
import { describeDbError, prisma } from "@/lib/prisma";
import { rateLimitByIp } from "@/lib/rate-limit";
import { notifyLeadWithoutDatabase, notifyNewLead, type LeadNotification } from "@/lib/telegram";
import { calculatorLeadSchema, contactLeadSchema, quizLeadSchema } from "@/lib/validations";
import type { LeadApiResponse } from "@/types/site";

import { fail, failRetryAfter, parseBody, readJsonBody } from "@/app/api/_lib/http";
import { omitKeys, toJsonValue } from "@/app/api/_lib/serialize";

export const dynamic = "force-dynamic";

/** Джерела, які приймає цей ендпоінт (клік у Telegram рахує `/api/track`). */
const LEAD_SOURCES: LeadSourceKey[] = ["QUIZ", "CALCULATOR", "CONTACT"];

function isLeadSource(value: unknown): value is LeadSourceKey {
  return typeof value === "string" && (LEAD_SOURCES as string[]).includes(value);
}

/** Заявка, приведена до єдиного вигляду незалежно від джерела. */
type NormalizedLead = {
  source: LeadSourceKey;
  name: string;
  phone: string;
  holidayType: HolidayTypeKey | null;
  audience: AudienceKey | null;
  guests: GuestsKey | null;
  budget: BudgetKey | null;
  decorLevel: DecorLevelKey | null;
  delivery: boolean | null;
  /** Календарна дата `YYYY-MM-DD`. */
  eventDate: string | null;
  guestsCount: number | null;
  comment: string | null;
  visitorId: string | null;
  quizAnswers: Record<string, unknown> | null;
};

type NormalizeResult =
  | { ok: true; lead: NormalizedLead; quote: Quote | null }
  | { ok: false; response: NextResponse };

/** Валідація схемою відповідного джерела + нормалізація в один тип. */
function normalizeLead(
  source: LeadSourceKey,
  body: Record<string, unknown>,
  pricing: PricingConfig,
): NormalizeResult {
  if (source === "QUIZ") {
    const parsed = parseBody(quizLeadSchema, body);
    if (!parsed.ok) return { ok: false, response: parsed.response };
    const data = parsed.data;
    return {
      ok: true,
      quote: null,
      lead: {
        source,
        name: data.name,
        phone: data.phone,
        holidayType: data.holidayType,
        // Кроки AUDIENCE і BUDGET можуть бути вимкнені в /admin/quiz,
        // тому поле приходить як undefined — у базу пишемо null.
        audience: data.audience ?? null,
        guests: data.guests,
        budget: data.budget ?? null,
        decorLevel: null,
        delivery: null,
        eventDate: data.eventDate ?? null,
        guestsCount: null,
        comment: null,
        visitorId: data.visitorId ?? null,
        // Весь payload без honeypot і часу заповнення — щоб можна було
        // перебудувати воронку квіза з бази, а не лише з логів.
        quizAnswers: omitKeys(body, ["honeypot", "elapsedMs"]),
      },
    };
  }

  if (source === "CALCULATOR") {
    const parsed = parseBody(calculatorLeadSchema, body);
    if (!parsed.ok) return { ok: false, response: parsed.response };
    const data = parsed.data;
    // Ваги беруться з конфігурації квіза (/admin/quiz), а не з коду —
    // тому показана й збережена ціна залишаються узгодженими навіть
    // після редагування варіантів адміністратором.
    const quote = calculateQuote(
      {
        holidayType: data.holidayType,
        guests: data.guests,
        guestsCount: data.guestsCount ?? null,
        decorLevel: data.decorLevel,
        delivery: data.delivery,
      },
      pricing,
    );
    return {
      ok: true,
      quote,
      lead: {
        source,
        name: data.name,
        phone: data.phone,
        holidayType: data.holidayType,
        audience: null,
        guests: data.guests,
        budget: null,
        decorLevel: data.decorLevel,
        delivery: data.delivery,
        eventDate: null,
        guestsCount: quote.guestsCount,
        comment: null,
        visitorId: data.visitorId ?? null,
        quizAnswers: null,
      },
    };
  }

  const parsed = parseBody(contactLeadSchema, body);
  if (!parsed.ok) return { ok: false, response: parsed.response };
  const data = parsed.data;
  return {
    ok: true,
    quote: null,
    lead: {
      source,
      name: data.name,
      phone: data.phone,
      holidayType: data.holidayType ?? null,
      audience: null,
      guests: null,
      budget: null,
      decorLevel: null,
      delivery: null,
      eventDate: null,
      guestsCount: null,
      comment: data.comment ?? null,
      visitorId: data.visitorId ?? null,
      quizAnswers: null,
    },
  };
}

/** Honeypot: бот заповнює приховане поле, людина його не бачить. */
function hasHoneypot(body: Record<string, unknown>): boolean {
  const value = body.honeypot;
  if (value === undefined || value === null) return false;
  return String(value).trim() !== "";
}

/** Менш ніж 1,2 с на заповнення форми — так швидко людина не встигає. */
function sentTooFast(body: Record<string, unknown>): boolean {
  const elapsed = Number(body.elapsedMs);
  return Number.isFinite(elapsed) && elapsed < 1200;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Обмеження частоти — найперше, щоб сміттєвий трафік не читав базу.
    const limit = rateLimitByIp(request.headers, "leads", 5, 600);
    if (!limit.ok) {
      return failRetryAfter(
        "Забагато заявок. Спробуйте, будь ласка, за кілька хвилин.",
        limit.retryAfterSeconds,
      );
    }

    // 2. Тіло запиту.
    const body = await readJsonBody(request);
    if (!body) return fail("Не вдалося прочитати дані форми. Спробуйте, будь ласка, ще раз.", 400);

    // 3-4. Антиспам: відповідаємо як за успіх, але заявку не створюємо.
    // Бот не має зрозуміти, що його розпізнали — інакше підбере обхід.
    if (hasHoneypot(body) || sentTooFast(body)) {
      return NextResponse.json({ ok: true, message: "Дякуємо!" });
    }

    if (!isLeadSource(body.source)) {
      return fail("Невідоме джерело заявки", 400);
    }
    const source = body.source;

    // 5. Валідація за схемою джерела.
    const quizConfig = await getQuizConfig();
    const normalized = normalizeLead(source, body, pricingFromConfig(quizConfig));
    if (!normalized.ok) return normalized.response;
    const { lead, quote } = normalized;

    // 6. Телефон уже канонічний `+380XXXXXXXXX`; лишилось відсіяти сміття.
    if (looksLikeFakePhone(lead.phone)) {
      return fail("Перевірте, будь ласка, номер телефону", 400, {
        phone: "Схоже, номер вказано неправильно",
      });
    }

    const settings = await getSiteSettings();
    const notification: LeadNotification = {
      name: lead.name,
      phone: lead.phone,
      sourceLabel: LEAD_SOURCE_LABELS[source],
      holidayLabel: lead.holidayType ? resolveOptionLabel(quizConfig, "HOLIDAY", lead.holidayType) : undefined,
      budgetLabel: lead.budget ? resolveOptionLabel(quizConfig, "BUDGET", lead.budget) : undefined,
      guestsLabel: lead.guests ? resolveOptionLabel(quizConfig, "GUESTS", lead.guests) : undefined,
      decorLabel: lead.decorLevel ? resolveOptionLabel(quizConfig, "DECOR", lead.decorLevel) : undefined,
      eventDate: lead.eventDate,
      estimatedPrice: quote?.estimatedPrice ?? null,
      recommendedBalloons: quote?.recommendedBalloons ?? null,
      recommendedPackageName: quote?.recommendedPackageName ?? null,
      delivery: lead.delivery,
      comment: lead.comment,
    };

    // 7-8. Запис у базу. ЗАПИС іде напряму в Prisma (не через `readDb`):
    // збій тут має бути видно, щоб лід не загубився тихо.
    const data: Prisma.LeadCreateInput = {
      source: lead.source,
      status: "NEW",
      name: lead.name,
      phone: lead.phone,
      phoneNormalized: lead.phone,
      holidayType: lead.holidayType,
      audience: lead.audience,
      guests: lead.guests,
      budget: lead.budget,
      decorLevel: lead.decorLevel,
      delivery: lead.delivery,
      eventDate: lead.eventDate ? new Date(`${lead.eventDate}T00:00:00`) : null,
      guestsCount: lead.guestsCount,
      recommendedBalloons: quote?.recommendedBalloons ?? null,
      estimatedPrice: quote?.estimatedPrice ?? null,
      recommendedPackage: quote?.recommendedPackage ?? null,
      comment: lead.comment,
      ip: getClientIp(request.headers),
      userAgent: request.headers.get("user-agent"),
      visitorId: lead.visitorId,
      ...(lead.quizAnswers ? { quizAnswers: toJsonValue(lead.quizAnswers) ?? undefined } : {}),
    };

    let leadId: string | null = null;
    try {
      const created = await prisma.lead.create({ data });
      leadId = created.id;
    } catch (dbError) {
      // База недоступна — заявка ще врятована Telegram-ом.
      console.error("[leads] заявку не збережено в базу:", describeDbError(dbError));
      const telegram = await notifyLeadWithoutDatabase({ ...notification, rawPhone: lead.phone });

      if (telegram.ok) {
        const degraded: LeadApiResponse = {
          ok: true,
          message: "Заявку прийнято й передано менеджеру. Збереження в базу тимчасово недоступне.",
        };
        return NextResponse.json(degraded);
      }

      // Обидва канали недоступні — це вже помилка, і користувачеві
      // потрібен робочий спосіб зв'язатися з магазином.
      return fail(
        `Не вдалося надіслати заявку. Зателефонуйте нам, будь ласка: ${settings.phone}.`,
        503,
      );
    }

    // 9. Telegram: заявка вже в базі, тому збій лише логуємо.
    const telegram = await notifyNewLead(notification);
    if (!telegram.ok) {
      console.warn("[leads] Telegram не доставив сповіщення:", telegram.skipped ? "не налаштований" : telegram.error);
    }

    // 10. Відповідь.
    const response: LeadApiResponse = {
      ok: true,
      message: "Дякуємо! Ми зв'язжемось з вами найближчим часом.",
      leadId,
      telegramUrl: telegramUrl(settings, telegramLeadMessage(lead.name)),
    };

    if (source === "QUIZ") response.discountPercent = settings.discountPercent;

    if (quote) {
      response.quote = {
        guestsCount: quote.guestsCount,
        recommendedBalloons: quote.recommendedBalloons,
        estimatedPrice: quote.estimatedPrice,
        priceMax: quote.priceMax,
        recommendedPackage: quote.recommendedPackage,
        recommendedPackageName: quote.recommendedPackageName,
        deliveryFree: quote.deliveryFree,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[leads] непередбачена помилка:", error);
    return fail("Сталася помилка. Спробуйте, будь ласка, ще раз або зателефонуйте нам.", 500);
  }
}
