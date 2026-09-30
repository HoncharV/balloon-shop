/**
 * Робота з конфігурацією квіза: валідація, ваги калькулятора, пошук підписів.
 *
 * Модуль **client-safe** (без Prisma і без Next.js): його імпортують і
 * клієнтські компоненти лендінга, і редактор квіза в адмінці, і адмінська
 * таблиця заявок. Серверне читання з бази живе окремо — `getQuizConfig()`
 * у `src/lib/content.ts`.
 */

import { z } from "zod";
import {
  ALWAYS_ENABLED_STEP_KEYS,
  DEFAULT_QUIZ_CONFIG,
  QUIZ_STEP_ORDER,
  type QuizConfigData,
  type QuizOptionConfig,
  type QuizStepConfig,
  type QuizStepKey,
} from "@/data/quiz-config";

// ------------------------------------------------------------------ схема

const weightsSchema = z
  .object({
    volume: z.number().positive().max(10).optional(),
    surcharge: z.number().int().min(0).max(1_000_000).optional(),
    midpoint: z.number().int().min(1).max(500).optional(),
    budgetFloor: z.number().int().min(0).max(1_000_000).optional(),
    pricePerBalloon: z.number().int().min(1).max(100_000).optional(),
    balloonsPerGuest: z.number().min(0.1).max(20).optional(),
  })
  .strict();

const optionSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "Вкажіть код варіанта")
    .max(40)
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Код варіанта — лише великі латинські літери, цифри та підкреслення (напр. WEDDING)",
    ),
  label: z.string().trim().min(1, "Вкажіть підпис варіанта").max(120),
  hint: z.string().trim().max(160).optional(),
  emoji: z.string().trim().max(8).optional(),
  isEnabled: z.boolean(),
  weights: weightsSchema.optional(),
});

const stepSchema = z.object({
  key: z.enum(QUIZ_STEP_ORDER as [QuizStepKey, ...QuizStepKey[]]),
  title: z.string().trim().min(1, "Вкажіть заголовок кроку").max(160),
  subtitle: z.string().trim().max(300).optional(),
  isEnabled: z.boolean(),
  options: z.array(optionSchema).max(30, "Забагато варіантів у кроці"),
});

/**
 * Схема всього документа конфігурації.
 *
 * Перевіряє не лише типи, а й те, без чого квіз ламається:
 *  · кожен крок зі `QUIZ_STEP_ORDER` присутній рівно один раз;
 *  · код варіанта унікальний у межах кроку;
 *  · у кроках з варіантами є хоч один увімкнений;
 *  · ваги, без яких калькулятор не порахує, заповнені.
 */
export const quizConfigSchema = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(3, "Вкажіть заголовок квіза").max(200),
    subtitle: z.string().trim().max(400),
    deliveryPrice: z.number().int().min(0, "Вартість доставки не може бути від'ємною").max(100_000),
    freeDeliveryFrom: z.number().int().min(0, "Поріг безкоштовної доставки не може бути від'ємним").max(1_000_000),
    steps: z.array(stepSchema).length(QUIZ_STEP_ORDER.length, "Кількість кроків змінювати не можна"),
  })
  .superRefine((config, ctx) => {
    const seen = new Set<string>();

    for (const [index, step] of config.steps.entries()) {
      if (seen.has(step.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", index, "key"],
          message: `Крок ${step.key} дублюється`,
        });
      }
      seen.add(step.key);

      // Деякі кроки вимикати не можна: без них ламається калькулятор
      // (zod-схема заявки вимагає ці поля) або зникає форма контактів.
      if (!step.isEnabled && ALWAYS_ENABLED_STEP_KEYS.includes(step.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", index, "isEnabled"],
          message: `Крок «${step.title}» вимкнути не можна — без нього не вийде прийняти заявку`,
        });
      }

      if (step.key === "DATE" || step.key === "CONTACTS") {
        if (step.options.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["steps", index, "options"],
            message: "Цей крок не має варіантів",
          });
        }
        continue;
      }

      const enabled = step.options.filter((option) => option.isEnabled);
      if (enabled.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps", index, "options"],
          message: "Потрібно щонайменше 2 увімкнені варіанти",
        });
      }

      const codes = new Set<string>();
      for (const [optionIndex, option] of step.options.entries()) {
        if (codes.has(option.value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["steps", index, "options", optionIndex, "value"],
            message: `Код ${option.value} повторюється в цьому кроці`,
          });
        }
        codes.add(option.value);

        // Ваги для калькулятора: без них розрахунок «тихо» поїде.
        if (step.key === "HOLIDAY" && typeof option.weights?.volume !== "number") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["steps", index, "options", optionIndex, "weights", "volume"],
            message: "Для свята вкажіть множник обсягу (напр. 1 або 1.35)",
          });
        }
        if (step.key === "GUESTS" && typeof option.weights?.midpoint !== "number") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["steps", index, "options", optionIndex, "weights", "midpoint"],
            message: "Вкажіть, скільки гостей закладати в розрахунок",
          });
        }
        if (step.key === "DECOR") {
          if (typeof option.weights?.pricePerBalloon !== "number") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["steps", index, "options", optionIndex, "weights", "pricePerBalloon"],
              message: "Вкажіть ціну однієї кульки",
            });
          }
          if (typeof option.weights?.balloonsPerGuest !== "number") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["steps", index, "options", optionIndex, "weights", "balloonsPerGuest"],
              message: "Вкажіть кількість кульок на одного гостя",
            });
          }
        }
      }
    }

    for (const key of QUIZ_STEP_ORDER) {
      if (!seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["steps"],
          message: `Немає кроку ${key}`,
        });
      }
    }
  });

export type QuizConfigInput = z.infer<typeof quizConfigSchema>;

// -------------------------------------------------------------- доступи

/** Крок за ключем (з підстановкою типового, якщо в базі його немає). */
export function getStep(config: QuizConfigData, key: QuizStepKey): QuizStepConfig {
  return (
    config.steps.find((step) => step.key === key) ??
    DEFAULT_QUIZ_CONFIG.steps.find((step) => step.key === key)!
  );
}

/** Лише увімкнені варіанти кроку — те, що бачить відвідувач. */
export function getEnabledOptions(config: QuizConfigData, key: QuizStepKey): QuizOptionConfig[] {
  return getStep(config, key).options.filter((option) => option.isEnabled);
}

/**
 * Підпис варіанта для показу збережених даних.
 *
 * Свідомо шукає серед УСІХ варіантів (навіть вимкнених) і, якщо не знайшов,
 * звертається до вбудованих типових підписів. Причина: якщо адміністратор
 * перейменував або приховав варіант, старі заявки мають усе одно показувати
 * зрозумілу назву, а не голий код `MATERNITY`.
 */
export function resolveOptionLabel(
  config: QuizConfigData,
  key: QuizStepKey,
  value: string | null | undefined,
): string {
  if (!value) return "—";

  const inConfig = getStep(config, key).options.find((option) => option.value === value);
  if (inConfig) return inConfig.label;

  const inDefaults = DEFAULT_QUIZ_CONFIG.steps
    .find((step) => step.key === key)
    ?.options.find((option) => option.value === value);
  if (inDefaults) return inDefaults.label;

  return value;
}

// ------------------------------------------------- ваги для калькулятора

export type DecorWeights = {
  pricePerBalloon: number;
  balloonsPerGuest: number;
  surcharge: number;
};

export type PricingConfig = {
  /** GUESTS: код діапазону → кількість гостей у розрахунку. */
  guestMidpoints: Record<string, number>;
  /** HOLIDAY: код свята → множник обсягу та надбавка. */
  holidayModifiers: Record<string, { volume: number; surcharge: number }>;
  /** DECOR: код рівня → ціна кульки, кульок на гостя, надбавка. */
  decorLevels: Record<string, DecorWeights>;
  /** BUDGET: код діапазону → нижня межа, грн. */
  budgetFloors: Record<string, number>;
  deliveryPrice: number;
  freeDeliveryFrom: number;
};

function buildPricing(config: QuizConfigData): PricingConfig {
  const pricing: PricingConfig = {
    guestMidpoints: {},
    holidayModifiers: {},
    decorLevels: {},
    budgetFloors: {},
    deliveryPrice: config.deliveryPrice,
    freeDeliveryFrom: config.freeDeliveryFrom,
  };

  for (const step of config.steps) {
    for (const option of step.options) {
      const weights = option.weights;
      if (!weights) continue;

      if (step.key === "GUESTS" && typeof weights.midpoint === "number") {
        pricing.guestMidpoints[option.value] = weights.midpoint;
      }
      if (step.key === "HOLIDAY" && typeof weights.volume === "number") {
        pricing.holidayModifiers[option.value] = {
          volume: weights.volume,
          surcharge: weights.surcharge ?? 0,
        };
      }
      if (step.key === "DECOR" && typeof weights.pricePerBalloon === "number") {
        pricing.decorLevels[option.value] = {
          pricePerBalloon: weights.pricePerBalloon,
          balloonsPerGuest: weights.balloonsPerGuest ?? 1,
          surcharge: weights.surcharge ?? 0,
        };
      }
      if (step.key === "BUDGET" && typeof weights.budgetFloor === "number") {
        pricing.budgetFloors[option.value] = weights.budgetFloor;
      }
    }
  }

  return pricing;
}

/**
 * Ваги з конфігурації, доповнені типовими значеннями.
 *
 * Доповнення важливе: у базі може лежати конфігурація, збережена до появи
 * якогось поля (або адміністратор прибрав вагу). Без підстановки калькулятор
 * отримав би `undefined` і видав би `NaN` у ціні.
 */
export function pricingFromConfig(config: QuizConfigData | null | undefined): PricingConfig {
  const fromDefaults = buildPricing(DEFAULT_QUIZ_CONFIG);
  if (!config) return fromDefaults;

  const fromConfig = buildPricing(config);

  return {
    guestMidpoints: { ...fromDefaults.guestMidpoints, ...fromConfig.guestMidpoints },
    holidayModifiers: { ...fromDefaults.holidayModifiers, ...fromConfig.holidayModifiers },
    decorLevels: { ...fromDefaults.decorLevels, ...fromConfig.decorLevels },
    budgetFloors: { ...fromDefaults.budgetFloors, ...fromConfig.budgetFloors },
    deliveryPrice: config.deliveryPrice ?? fromDefaults.deliveryPrice,
    freeDeliveryFrom: config.freeDeliveryFrom ?? fromDefaults.freeDeliveryFrom,
  };
}

/**
 * Перетворює те, що лежить у базі, на валідну конфігурацію.
 * Будь-яка розбіжність із схемою → типові значення, щоб лендінг не впав.
 */
export function normalizeQuizConfig(raw: unknown): QuizConfigData {
  const parsed = quizConfigSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_QUIZ_CONFIG;
  return parsed.data as QuizConfigData;
}
