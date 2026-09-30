/**
 * Контент «з коробки» для всього сайту.
 *
 * ЄДИНЕ ДЖЕРЕЛО ПРАВДИ з двох причин:
 *  1. `prisma/seed.ts` наповнює цим базу;
 *  2. `src/lib/content.ts` віддає це як fallback, коли база недоступна —
 *     лендінг має рендеритись навіть без PostgreSQL.
 *
 * Тому цей файл НЕ імпортує нічого з Next.js чи Prisma Client: його
 * читають і `tsx` (сід), і серверний рендер.
 *
 * Усі ключі-перелічення тут — рядкові літерали, що збігаються з enum'ами
 * у `prisma/schema.prisma`.
 */

export type HolidayTypeKey = "BIRTHDAY" | "KIDS" | "GENDER_PARTY" | "WEDDING" | "CORPORATE" | "MATERNITY";
export type GalleryCategoryKey = "BIRTHDAY" | "WEDDING" | "CORPORATE" | "KIDS";

export type SiteSettingsContent = {
  phone: string;
  telegram: string;
  instagram: string;
  address: string;
  mapEmbedUrl: string | null;
  workingHours: string;
  discountPercent: number;
};

export type PackageContent = {
  slug: string;
  name: string;
  priceFrom: number;
  description: string;
  features: string[];
  imageUrl: string;
  isPopular: boolean;
  sortOrder: number;
};

export type GalleryContent = {
  title: string;
  description: string;
  category: GalleryCategoryKey;
  imageUrl: string;
  sortOrder: number;
};

export type TestimonialContent = {
  name: string;
  photoUrl: string | null;
  text: string;
  rating: number;
  eventType: string;
  sortOrder: number;
};

/** Контакти взяті з реального профілю магазину; редагуються в /admin/settings. */
export const DEFAULT_SETTINGS: SiteSettingsContent = {
  phone: "+380678873333",
  telegram: "party_mode_kiev",
  instagram: "party_mode_kiev",
  address: "Лісовий проспект, 23Б, Київ, 02000",
  mapEmbedUrl: null,
  workingHours: "Щодня 9:00 – 21:00",
  discountPercent: 10,
};

/** Готові набори. Порядок і ціни — з брифу. */
export const DEFAULT_PACKAGES: PackageContent[] = [
  {
    slug: "start",
    name: "START",
    priceFrom: 999,
    description:
      "Ідеальний набір для домашнього свята або невеликого привітання. Яскраво, святково й без зайвих витрат.",
    features: [
      "15 повітряних кульок",
      "Доставка по Києву",
      "Підбір кольорової гами",
      "Гарантія польоту 7 днів",
    ],
    imageUrl: "/images/packages/start.svg",
    isPopular: false,
    sortOrder: 1,
  },
  {
    slug: "standard",
    name: "STANDARD",
    priceFrom: 1999,
    description:
      "Найчастіше обирають на дні народження: кульки, цифра з фольги та доставка у зручний час.",
    features: [
      "35 повітряних кульок",
      "Фольгована цифра у подарунок",
      "Доставка по Києву",
      "Гарантія польоту 7 днів",
      "Оформлення у вашій кольоровій гамі",
    ],
    imageUrl: "/images/packages/standard.svg",
    isPopular: true,
    sortOrder: 2,
  },
  {
    slug: "premium",
    name: "PREMIUM",
    priceFrom: 3999,
    description:
      "Повноцінна святкова локація: арка, фотозона та кульки — усе, щоб гості одразу дістали телефони.",
    features: [
      "70 повітряних кульок",
      "Фотозона під ключ",
      "Арка з кульок",
      "Доставка і монтаж",
      "Гарантія польоту 7 днів",
      "Терміновий запуск день у день",
    ],
    imageUrl: "/images/packages/premium.svg",
    isPopular: false,
    sortOrder: 3,
  },
];

/** Галерея «Наші роботи» — 12 фото з коробки, 4 категорії. */
export const DEFAULT_GALLERY: GalleryContent[] = [
  {
    title: "День народження у рожевих тонах",
    description: "Класична композиція з кульок і фольгованої цифри",
    category: "BIRTHDAY",
    imageUrl: "/images/gallery/gallery-01.svg",
    sortOrder: 1,
  },
  {
    title: "Кульки-бульбашки на 30 років",
    description: "Прозорі кульки з конфеті та святковим написом",
    category: "BIRTHDAY",
    imageUrl: "/images/gallery/gallery-02.svg",
    sortOrder: 2,
  },
  {
    title: "Святковий стіл із кульками",
    description: "Оформлення зони святкування вдома",
    category: "BIRTHDAY",
    imageUrl: "/images/gallery/gallery-03.svg",
    sortOrder: 3,
  },
  {
    title: "Сюрприз для найкращої подруги",
    description: "Кульки в коробці з ефектом відкриття",
    category: "BIRTHDAY",
    imageUrl: "/images/gallery/gallery-04.svg",
    sortOrder: 4,
  },
  {
    title: "Весільна арка",
    description: "Ніжно-блакитна арка на церемонію",
    category: "WEDDING",
    imageUrl: "/images/gallery/gallery-05.svg",
    sortOrder: 5,
  },
  {
    title: "Фотозона для наречених",
    description: "Кулькова стіна з живими квітами",
    category: "WEDDING",
    imageUrl: "/images/gallery/gallery-06.svg",
    sortOrder: 6,
  },
  {
    title: "Оформлення банкетної зали",
    description: "Підвісні кульки під стелею зали",
    category: "WEDDING",
    imageUrl: "/images/gallery/gallery-07.svg",
    sortOrder: 7,
  },
  {
    title: "Новорічний корпоратив",
    description: "Золото й білий — святковий корпоратив компанії",
    category: "CORPORATE",
    imageUrl: "/images/gallery/gallery-08.svg",
    sortOrder: 8,
  },
  {
    title: "Відкриття магазину",
    description: "Кульки у брендових кольорах на відкриття",
    category: "CORPORATE",
    imageUrl: "/images/gallery/gallery-09.svg",
    sortOrder: 9,
  },
  {
    title: "Перший день народження",
    description: "Дитяче свято з кульками-звірятами",
    category: "KIDS",
    imageUrl: "/images/gallery/gallery-10.svg",
    sortOrder: 10,
  },
  {
    title: "Гендер-паті",
    description: "Рожево-блакитний сюрприз у коробці",
    category: "KIDS",
    imageUrl: "/images/gallery/gallery-11.svg",
    sortOrder: 11,
  },
  {
    title: "Дитяча фотозона",
    description: "Різнобарв'я кульок для дитячого свята",
    category: "KIDS",
    imageUrl: "/images/gallery/gallery-12.svg",
    sortOrder: 12,
  },
];

export const DEFAULT_TESTIMONIALS: TestimonialContent[] = [
  {
    name: "Олена К.",
    photoUrl: null,
    text: "Замовляла кульки на день народження доньки — приїхали вчасно, все було саме так, як на фото. Донька була в захваті, кульки тримались понад тиждень!",
    rating: 5,
    eventType: "Дитяче свято",
    sortOrder: 1,
  },
  {
    name: "Андрій М.",
    photoUrl: null,
    text: "Робили фотозону на весілля. Хлопці приїхали, змонтували за годину, прибрали пакування. Гості фотографувались весь вечір.",
    rating: 5,
    eventType: "Весілля",
    sortOrder: 2,
  },
  {
    name: "Марина Т.",
    photoUrl: null,
    text: "Замовляла арку на корпоратив за день до заходу. Все встигли, кольори підібрали під логотип компанії. Дуже задоволена сервісом.",
    rating: 5,
    eventType: "Корпоратив",
    sortOrder: 3,
  },
  {
    name: "Ірина В.",
    photoUrl: null,
    text: "Гендер-паті вийшло неймовірним! Кульки в коробці, дим, музика — емоції зашкалювали. Рекомендую всім, хто хоче справжній сюрприз.",
    rating: 5,
    eventType: "Гендер Паті",
    sortOrder: 4,
  },
  {
    name: "Дмитро С.",
    photoUrl: null,
    text: "Замовляв виписку з пологового. Дружині сподобалось, кульки були саме тієї кольорової гами, яку просив. Дякую за оперативність.",
    rating: 5,
    eventType: "Виписка",
    sortOrder: 5,
  },
  {
    name: "Наталія П.",
    photoUrl: null,
    text: "Третій рік поспіль замовляємо кульки на дні народження дітей. Завжди вчасно, завжди яскраво, завжди з посмішкою. Наші постійні постачальники свята!",
    rating: 5,
    eventType: "День народження",
    sortOrder: 6,
  },
];

/** Блок «Переваги» — 4 картки з брифу. */
export const ADVANTAGES = [
  {
    icon: "truck" as const,
    title: "Доставка день у день",
    text: "Приймаємо замовлення до 15:00 — і привозимо того ж дня по Києву. Термінові замовлення беремо окремо.",
  },
  {
    icon: "shield" as const,
    title: "Гарантія польоту кульок",
    text: "Обробляємо кульки спеціальним складом: тримають форму та літають щонайменше 7 днів.",
  },
  {
    icon: "factory" as const,
    title: "Власне виробництво",
    text: "Не посередники: самі закуповуємо гелій і матеріали, тому тримаємо ціни та якість під контролем.",
  },
  {
    icon: "heart" as const,
    title: "Понад 1000 задоволених клієнтів",
    text: "За 5 років оформили більше тисячі свят. Багато клієнтів повертаються до нас щороку.",
  },
];

/** Статистика для hero-блоку. */
export const HERO_STATS = [
  { value: "1000+", label: "оформлених свят" },
  { value: "7 днів", label: "гарантія польоту" },
  { value: "5 років", label: "на ринку Києва" },
];
