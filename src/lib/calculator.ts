/**
 * Калькулятор вартості оформлення — чиста функція без побічних ефектів.
 *
 * Свідомо без залежностей від React/Prisma: цю саму логіку викликає
 * API-роут, щоб зберегти в заявку вже перевірені числа. Одне джерело
 * правди — інакше клієнт і сервер почнуть рахувати по-різному.
 *
 * ВАЖЛИВО: числові коефіцієнти тут БІЛЬШЕ НЕ ЗАШИТІ. Вони приходять
 * другим аргументом (`PricingConfig`) із конфігурації квіза, яку
 * адміністратор редагує в /admin/quiz. Це єдина причина, чому калькулятор
 * лишається узгодженим із квізом: якщо власник перейменував або прибрав
 * варіант свята, ціна рахується за тими самими даними, які бачить клієнт.
 *
 * Типові значення (коли база недоступна) лежать у
 * `src/data/quiz-config.ts` → `DEFAULT_QUIZ_CONFIG`, а збирає їх у потрібну
 * форму `pricingFromConfig()` з `src/lib/quiz-config.ts`.
 *
 * Формула:
 *   гостей          = явна кількість або середина діапазону
 *   кульок          = clamp(⌈гостей × кульок-на-гостя × множник свята⌉, 10, 120)
 *   разом           = кульки + надбавка за декор + надбавка за свято + доставка
 */

import type { DecorLevelKey, GuestsKey, HolidayTypeKey } from "./constants";
import type { PricingConfig } from "./quiz-config";

/** Якщо код діапазону відсутній у конфігурації — беремо стільки гостей. */
const FALLBACK_GUESTS_MIDPOINT = 15;
/** Типовий рівень оформлення, якщо код невідомий. */
const FALLBACK_DECOR = { pricePerBalloon: 60, balloonsPerGuest: 1.6, surcharge: 250 };

const MIN_BALLOONS = 10;
const MAX_BALLOONS = 120;

export type QuoteInput = {
  holidayType?: HolidayTypeKey | string | null;
  guests?: GuestsKey | string | null;
  /** Явна кількість гостей має пріоритет над діапазоном. */
  guestsCount?: number | null;
  decorLevel: DecorLevelKey | string;
  delivery: boolean;
};

export type Quote = {
  guestsCount: number;
  recommendedBalloons: number;
  /** Орієнтовна вартість, грн (округлена до 50). */
  estimatedPrice: number;
  /** Верхня межа «від … грн» для показу клієнту. */
  priceMax: number;
  recommendedPackage: "start" | "standard" | "premium";
  recommendedPackageName: string;
  breakdown: {
    balloonsPrice: number;
    decorSurcharge: number;
    holidaySurcharge: number;
    deliveryPrice: number;
  };
  deliveryFree: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundTo50(value: number) {
  return Math.round(value / 50) * 50;
}

/** Число з конфігурації, із захистом від `NaN` і `Infinity`. */
function safeNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Розраховує орієнтовну пропозицію.
 *
 * @param input   вибір клієнта (коди з конфігурації квіза)
 * @param pricing ваги з конфігурації — обов'язкові
 */
export function calculateQuote(input: QuoteInput, pricing: PricingConfig): Quote {
  const guestsCount =
    input.guestsCount && input.guestsCount > 0
      ? Math.min(Math.round(input.guestsCount), 500)
      : safeNumber(
          input.guests ? pricing.guestMidpoints[input.guests] : undefined,
          FALLBACK_GUESTS_MIDPOINT,
        );

  const holiday = input.holidayType ? pricing.holidayModifiers[input.holidayType] : undefined;
  const holidayVolume = safeNumber(holiday?.volume, 1);
  const holidaySurcharge = safeNumber(holiday?.surcharge, 0);

  const decor = pricing.decorLevels[input.decorLevel] ?? FALLBACK_DECOR;
  const pricePerBalloon = safeNumber(decor.pricePerBalloon, FALLBACK_DECOR.pricePerBalloon);
  const balloonsPerGuest = safeNumber(decor.balloonsPerGuest, FALLBACK_DECOR.balloonsPerGuest);
  const decorSurcharge = safeNumber(decor.surcharge, 0);

  const recommendedBalloons = clamp(
    Math.ceil(guestsCount * balloonsPerGuest * holidayVolume),
    MIN_BALLOONS,
    MAX_BALLOONS,
  );

  const balloonsPrice = recommendedBalloons * pricePerBalloon;
  const subtotal = balloonsPrice + decorSurcharge + holidaySurcharge;

  const freeDeliveryFrom = safeNumber(pricing.freeDeliveryFrom, 3999);
  const deliveryPrice = safeNumber(pricing.deliveryPrice, 250);

  const deliveryFree = input.delivery && subtotal >= freeDeliveryFrom;
  const chargedDelivery = input.delivery && !deliveryFree ? deliveryPrice : 0;

  const total = subtotal + chargedDelivery;
  const estimatedPrice = roundTo50(total);

  const recommendedPackage: Quote["recommendedPackage"] =
    estimatedPrice < 1800 ? "start" : estimatedPrice < 3600 ? "standard" : "premium";

  return {
    guestsCount,
    recommendedBalloons,
    estimatedPrice,
    // Верхня межа — «реалістичний розкид», а не точна ціна: клієнта
    // дратує одна цифра, яка потім зростає.
    priceMax: roundTo50(total * 1.25),
    recommendedPackage,
    recommendedPackageName: recommendedPackage.toUpperCase(),
    breakdown: {
      balloonsPrice: roundTo50(balloonsPrice),
      decorSurcharge,
      holidaySurcharge,
      deliveryPrice: chargedDelivery,
    },
    deliveryFree,
  };
}

/** Готовий текст для Telegram-повідомлення про заявку з калькулятора. */
export function quoteSummary(quote: Quote): string {
  const parts = [
    `${quote.recommendedBalloons} кульок`,
    `орієнтовно ${quote.estimatedPrice} грн`,
    `набір ${quote.recommendedPackageName}`,
  ];
  if (quote.deliveryFree) parts.push("доставка безкоштовна");
  return parts.join(" · ");
}
