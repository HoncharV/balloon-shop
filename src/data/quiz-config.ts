/**
 * Конфігурація квіз-воронки та ваг калькулятора.
 *
 * ЄДИНЕ ДЖЕРЕЛО ПРАВДИ, як і `site-content.ts`:
 *  1. `prisma/seed.ts` кладе це в базу;
 *  2. `src/lib/quiz-config.ts` віддає це як fallback, коли база недоступна;
 *  3. адмінка редагує копію в базі.
 *
 * Тому файл НЕ імпортує ні Next.js, ні Prisma — його читають і `tsx`,
 * і серверний рендер, і клієнтські компоненти шкоди.
 *
 * ⚠️ ГОЛОВНЕ ОБМЕЖЕННЯ ГНУЧКОСТІ
 * `options[].value` мусить лишатися в межах відповідного enum'а в
 * `prisma/schema.prisma`:
 *   HOLIDAY → HolidayType   (BIRTHDAY, KIDS, GENDER_PARTY, WEDDING, CORPORATE, MATERNITY)
 *   AUDIENCE → Audience     (BOY, GIRL, MAN, WOMAN)
 *   GUESTS  → GuestsRange   (UP_TO_10, FROM_10_TO_20, FROM_20_TO_50, OVER_50)
 *   BUDGET  → BudgetRange   (UP_TO_1000, FROM_1000_TO_3000, FROM_3000_TO_5000, OVER_5000)
 *   DECOR   → DecorLevel    (ECONOMY, STANDARD, PREMIUM)
 *
 * Підпис (`label`), підказку, емодзі, порядок і видимість міняти можна
 * вільно — у заявці зберігається саме `value`. А от ДОДАТИ нове значення
 * не можна без зміни enum'у в БД: `prisma.lead.create` тоді впаде з
 * помилкою валідації enum, і заявка не запишеться.
 */

export type QuizStepKey = "HOLIDAY" | "AUDIENCE" | "GUESTS" | "BUDGET" | "DATE" | "CONTACTS" | "DECOR";

/**
 * Числові параметри варіанта, які використовує калькулятор вартості.
 * Набір ключів залежить від кроку — саме тому це об'єкт, а не окремі колонки.
 */
export type OptionWeights = {
  /** HOLIDAY: множник обсягу оформлення (весілля потребує більше кульок). */
  volume?: number;
  /** HOLIDAY, DECOR: фіксована надбавка, грн. */
  surcharge?: number;
  /** GUESTS: скільки гостей «закладаємо» в розрахунок для цього діапазону. */
  midpoint?: number;
  /** BUDGET: нижня межа діапазону, грн (потрібна для попереджень). */
  budgetFloor?: number;
  /** DECOR: ціна однієї надутої кульки, грн. */
  pricePerBalloon?: number;
  /** DECOR: скільки кульок потрібно на одного гостя. */
  balloonsPerGuest?: number;
};

export type QuizOptionConfig = {
  /** Значення, яке потрапляє в заявку. Мусить бути в межах enum'а (див. вище). */
  value: string;
  label: string;
  hint?: string;
  emoji?: string;
  isEnabled: boolean;
  weights?: OptionWeights;
};

export type QuizStepConfig = {
  key: QuizStepKey;
  /** Заголовок кроку, напр. «Яке свято?». */
  title: string;
  subtitle?: string;
  isEnabled: boolean;
  /** Кроки DATE і CONTACTS варіантів не мають — масив порожній. */
  options: QuizOptionConfig[];
};

export type QuizConfigData = {
  version: 1;
  /** Заголовок усієї секції квіза. */
  title: string;
  subtitle: string;
  steps: QuizStepConfig[];
  /** Калькулятор: вартість доставки, грн. */
  deliveryPrice: number;
  /** Калькулятор: від якої суми доставка безкоштовна, грн. */
  freeDeliveryFrom: number;
};

/**
 * Порядок кроків у квізі фіксований і не редагується з адмінки.
 *
 * Це свідоме обмеження: зміна порядку — це рішення про UX воронки, а не про
 * контент, а «Дата» й «Контакти» мусять бути останніми за логікою. Редагувати
 * можна заголовки, підказки, набір варіантів і їхній порядок.
 *
 * `DECOR` у квізі не показується — він керує лише полем калькулятора.
 */
export const QUIZ_STEP_ORDER: QuizStepKey[] = [
  "HOLIDAY",
  "AUDIENCE",
  "GUESTS",
  "BUDGET",
  "DATE",
  "CONTACTS",
  "DECOR",
];

/** Кроки, які показуються відвідувачу у квізі (DECOR — ні). */
export const QUIZ_VISIBLE_STEP_KEYS: QuizStepKey[] = ["HOLIDAY", "AUDIENCE", "GUESTS", "BUDGET", "DATE", "CONTACTS"];

/**
 * Кроки, які не можна вимкнути з адмінки.
 *
 * Причина не косметична, а технічна:
 *  · `calculatorLeadSchema` (zod) ВИМАГАЄ `holidayType`, `guests` і
 *    `decorLevel` — без цих кроків калькулятор надсилав би заявку, яку
 *    сервер відхилить із 400;
 *  · без кроку CONTACTS нема де взяти ім'я й телефон, тобто зникає сенс
 *    усієї воронки.
 *
 * Вимкнути можна лише AUDIENCE, BUDGET і DATE — вони впливають тільки на
 * те, що ми знаємо про клієнта, а не на можливість прийняти заявку.
 */
export const ALWAYS_ENABLED_STEP_KEYS: QuizStepKey[] = ["HOLIDAY", "GUESTS", "DECOR", "CONTACTS"];

/**
 * Дозволені коди варіантів для кожного кроку — дзеркало enum'ів Prisma.
 *
 * Використовується редактором квіза: адміністратор може ЗМІНИТИ ПІДПИС
 * будь-якого варіанта, приховати його, переставити або ДОДАТИ варіант
 * із цього списку (наприклад, повернути «Виписку з пологів»). Але ввести
 * довільний код не можна — інакше заявка не запишеться, бо enum у БД
 * такого значення не має.
 */
export const ALLOWED_OPTION_VALUES: Record<QuizStepKey, string[]> = {
  HOLIDAY: ["BIRTHDAY", "KIDS", "GENDER_PARTY", "WEDDING", "CORPORATE", "MATERNITY"],
  AUDIENCE: ["BOY", "GIRL", "MAN", "WOMAN"],
  GUESTS: ["UP_TO_10", "FROM_10_TO_20", "FROM_20_TO_50", "OVER_50"],
  BUDGET: ["UP_TO_1000", "FROM_1000_TO_3000", "FROM_3000_TO_5000", "OVER_5000"],
  DECOR: ["ECONOMY", "STANDARD", "PREMIUM"],
  // Ці кроки варіантів не мають
  DATE: [],
  CONTACTS: [],
};

export const DEFAULT_QUIZ_CONFIG: QuizConfigData = {
  version: 1,
  title: "Підберемо ідеальне оформлення за 1 хвилину",
  subtitle:
    "Дайте відповідь на 6 коротких питань — і ми запропонуємо варіант під ваше свято, бюджет і кількість гостей.",
  deliveryPrice: 250,
  freeDeliveryFrom: 3999,
  steps: [
    {
      key: "HOLIDAY",
      title: "Яке свято?",
      isEnabled: true,
      options: [
        { value: "BIRTHDAY", label: "День народження", emoji: "🎂", isEnabled: true, weights: { volume: 1, surcharge: 0 } },
        { value: "KIDS", label: "Дитяче свято", emoji: "🧸", isEnabled: true, weights: { volume: 1, surcharge: 0 } },
        { value: "GENDER_PARTY", label: "Гендер Паті", emoji: "🍼", isEnabled: true, weights: { volume: 0.9, surcharge: 150 } },
        { value: "WEDDING", label: "Весілля", emoji: "💍", isEnabled: true, weights: { volume: 1.35, surcharge: 600 } },
        { value: "CORPORATE", label: "Корпоратив", emoji: "🥂", isEnabled: true, weights: { volume: 1.2, surcharge: 300 } },
        { value: "MATERNITY", label: "Виписка з пологового", emoji: "👶", isEnabled: true, weights: { volume: 0.85, surcharge: 0 } },
      ],
    },
    {
      key: "AUDIENCE",
      title: "Для кого свято?",
      subtitle: "Щоб підібрати кольорову гаму",
      isEnabled: true,
      options: [
        { value: "BOY", label: "Хлопчик", emoji: "👦", isEnabled: true },
        { value: "GIRL", label: "Дівчинка", emoji: "👧", isEnabled: true },
        { value: "MAN", label: "Чоловік", emoji: "👨", isEnabled: true },
        { value: "WOMAN", label: "Жінка", emoji: "👩", isEnabled: true },
      ],
    },
    {
      key: "GUESTS",
      title: "Скільки гостей?",
      isEnabled: true,
      options: [
        { value: "UP_TO_10", label: "До 10", hint: "камерне свято", isEnabled: true, weights: { midpoint: 8 } },
        { value: "FROM_10_TO_20", label: "10–20", hint: "найпопулярніше", isEnabled: true, weights: { midpoint: 15 } },
        { value: "FROM_20_TO_50", label: "20–50", hint: "велика компанія", isEnabled: true, weights: { midpoint: 35 } },
        { value: "OVER_50", label: "50+", hint: "масштабний захід", isEnabled: true, weights: { midpoint: 60 } },
      ],
    },
    {
      key: "BUDGET",
      title: "Ваш бюджет?",
      isEnabled: true,
      options: [
        { value: "UP_TO_1000", label: "До 1000 грн", isEnabled: true, weights: { budgetFloor: 0 } },
        { value: "FROM_1000_TO_3000", label: "1000–3000 грн", isEnabled: true, weights: { budgetFloor: 1000 } },
        { value: "FROM_3000_TO_5000", label: "3000–5000 грн", isEnabled: true, weights: { budgetFloor: 3000 } },
        { value: "OVER_5000", label: "5000+ грн", isEnabled: true, weights: { budgetFloor: 5000 } },
      ],
    },
    {
      key: "DATE",
      title: "Дата заходу",
      subtitle: "Можна залишити порожнім — уточнимо в розмові",
      isEnabled: true,
      options: [],
    },
    {
      key: "CONTACTS",
      title: "Контакти",
      subtitle: "Щоб надіслати підібраний варіант і знижку",
      isEnabled: true,
      options: [],
    },
    {
      key: "DECOR",
      title: "Рівень оформлення",
      subtitle: "Показується лише в калькуляторі вартості",
      isEnabled: true,
      options: [
        {
          value: "ECONOMY",
          label: "Економ",
          hint: "кульки та стрічки, без декору",
          isEnabled: true,
          weights: { pricePerBalloon: 45, balloonsPerGuest: 0.8, surcharge: 0 },
        },
        {
          value: "STANDARD",
          label: "Стандарт",
          hint: "кульки + цифра або невелика композиція",
          isEnabled: true,
          weights: { pricePerBalloon: 60, balloonsPerGuest: 1.6, surcharge: 250 },
        },
        {
          value: "PREMIUM",
          label: "Преміум",
          hint: "арка, фотозона, монтаж",
          isEnabled: true,
          weights: { pricePerBalloon: 85, balloonsPerGuest: 2.4, surcharge: 900 },
        },
      ],
    },
  ],
};
