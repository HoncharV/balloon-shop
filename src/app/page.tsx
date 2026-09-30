import type { Metadata } from "next";

import { Advantages } from "@/components/landing/advantages";
import { CalculatorBlock } from "@/components/landing/calculator-block";
import { Contacts } from "@/components/landing/contacts";
import { FloatingCta } from "@/components/landing/floating-cta";
import { Gallery } from "@/components/landing/gallery";
import { Hero } from "@/components/landing/hero";
import { Packages } from "@/components/landing/packages";
import { QuizFunnel } from "@/components/landing/quiz-funnel";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Testimonials } from "@/components/landing/testimonials";
import { getGallery, getPackages, getQuizConfig, getSiteSettings, getTestimonials } from "@/lib/content";
import { escapeJsonForScript } from "@/lib/html";
import { instagramUrl, telegramUrl } from "@/lib/links";

/**
 * Лендінг.
 *
 * `revalidate = 60` (ISR): сторінка статична для швидкості й SEO, але
 * правки з адмінки з'являються протягом хвилини. Мутації в адмінці
 * додатково викликають `revalidatePath("/")`, тому на практиці зміни
 * видно одразу.
 *
 * При збірці без доступної бази функції з `@/lib/content` повернуть
 * контент за замовчуванням — збірка не впаде.
 */
export const revalidate = 60;

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Повітряні кульки для будь-якого свята — доставка по Києву",
  description:
    "Гелієві кульки, арки та фотозони під ключ. Доставка день у день, гарантія польоту 7 днів, понад 1000 оформлених свят. Розрахуйте вартість за 1 хвилину.",
  alternates: { canonical: "/" },
};

/**
 * Витягує час роботи з вільного тексту налаштувань
 * («Щодня 9:00 – 21:00» → `09:00`/`21:00`).
 *
 * Якщо формат не розпізнано — структуровані години просто не додаються:
 * краще без них, ніж опублікувати неправдиві дані в розмітці.
 */
function openingHoursFrom(text: string): { opens: string; closes: string } | null {
  const matches = text.match(/(\d{1,2})[:.](\d{2})/g);
  if (!matches || matches.length < 2) return null;
  const normalize = (value: string) => {
    const [hours, minutes] = value.split(/[:.]/);
    return `${hours.padStart(2, "0")}:${minutes}`;
  };
  return { opens: normalize(matches[0]), closes: normalize(matches[1]) };
}

export default async function HomePage() {
  // Паралельно: п'ять незалежних читань не мають чекати одне одного.
  const [settings, packages, gallery, testimonials, quizConfig] = await Promise.all([
    getSiteSettings(),
    getPackages(),
    getGallery(),
    getTestimonials(),
    getQuizConfig(),
  ]);

  const hours = openingHoursFrom(settings.workingHours);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "Store"],
      "@id": `${siteUrl}/#business`,
      name: "Balloon Magic",
      description:
        "Магазин повітряних кульок у Києві: гелієві кульки, арки, фотозони та оформлення свят під ключ.",
      url: siteUrl,
      image: `${siteUrl}/images/hero.svg`,
      logo: `${siteUrl}/images/logo.svg`,
      telephone: settings.phone,
      priceRange: "₴₴",
      currenciesAccepted: "UAH",
      areaServed: { "@type": "City", name: "Київ" },
      address: {
        "@type": "PostalAddress",
        streetAddress: settings.address,
        addressLocality: "Київ",
        addressCountry: "UA",
      },
      sameAs: [instagramUrl(settings), telegramUrl(settings)].filter((url) => !/\/$/.test(url)),
      ...(hours
        ? {
            openingHoursSpecification: [
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ],
                opens: hours.opens,
                closes: hours.closes,
              },
            ],
          }
        : {}),
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Готові набори оформлення",
        itemListElement: packages.map((item, index) => ({
          "@type": "Offer",
          position: index + 1,
          name: item.name,
          description: item.description,
          priceCurrency: "UAH",
          price: item.priceFrom,
          itemOffered: {
            "@type": "Service",
            name: `${item.name} — оформлення повітряними кульками`,
            serviceType: "Оформлення свят повітряними кульками",
          },
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Balloon Magic",
      inLanguage: "uk-UA",
      publisher: { "@id": `${siteUrl}/#business` },
    },
  ];

  return (
    <>
      {/* JSON-LD екранується: сирий JSON усередині <script> дозволяє
          завершити тег і вставити довільну розмітку. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonForScript(JSON.stringify(structuredData)) }}
      />

      <SiteHeader settings={settings} />

      <main>
        {/* 1. Hero */}
        <Hero settings={settings} />

        {/* 2. Квіз-воронка */}
        <QuizFunnel
          config={quizConfig}
          settings={settings}
          discountPercent={settings.discountPercent}
        />

        {/* 3. Наші роботи */}
        <Gallery items={gallery} />

        {/* 4. Готові набори */}
        <Packages items={packages} />

        {/* 5. Калькулятор вартості */}
        <CalculatorBlock config={quizConfig} settings={settings} />

        {/* 6. Переваги */}
        <Advantages />

        {/* 7. Відгуки */}
        <Testimonials items={testimonials} />

        {/* 8. Контакти */}
        <Contacts settings={settings} config={quizConfig} />
      </main>

      <SiteFooter settings={settings} />

      {/* Мобільна липка панель «Подзвонити / Telegram» */}
      <FloatingCta settings={settings} />
    </>
  );
}
