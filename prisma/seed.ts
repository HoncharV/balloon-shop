/**
 * Наповнення бази даних «з коробки».
 *
 * Дані живуть у `src/data/site-content.ts` — тому сід і fallback лендінга
 * (коли база недоступна) ніколи не розходяться.
 *
 * Ідемпотентний: набори й налаштування — upsert за стабільним ключем,
 * галерея та відгуки додаються лише в порожню таблицю, щоб повторний
 * запуск не плодив копії.
 *
 * Запуск:  npm run db:seed
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import {
  DEFAULT_GALLERY,
  DEFAULT_PACKAGES,
  DEFAULT_SETTINGS,
  DEFAULT_TESTIMONIALS,
} from "../src/data/site-content";
import { DEFAULT_QUIZ_CONFIG } from "../src/data/quiz-config";

const prisma = new PrismaClient();

async function main() {
  console.log("→ Налаштування сайту…");
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...DEFAULT_SETTINGS },
  });

  // Конфігурація квіза створюється один раз. `update: {}` навмисно: повторний
  // сід не має затирати те, що адміністратор відредагував у /admin/quiz.
  console.log("→ Конфігурація квіза…");
  await prisma.quizConfig.upsert({
    where: { id: 1 },
    update: {},
    // Каст потрібен, бо тип JSON-поля Prisma не приймає опційні властивості,
    // а відсутні ключі (hint, subtitle) у документі — це нормально.
    create: { id: 1, data: DEFAULT_QUIZ_CONFIG as unknown as Prisma.InputJsonValue },
  });

  console.log("→ Готові набори…");
  for (const item of DEFAULT_PACKAGES) {
    await prisma.package.upsert({
      where: { slug: item.slug },
      update: { ...item },
      create: { ...item },
    });
  }

  console.log("→ Галерея робіт…");
  const galleryCount = await prisma.galleryItem.count();
  if (galleryCount === 0) {
    await prisma.galleryItem.createMany({
      data: DEFAULT_GALLERY.map((item) => ({ ...item, isPublished: true })),
    });
    console.log(`   додано ${DEFAULT_GALLERY.length}`);
  } else {
    console.log(`   вже є ${galleryCount} записів — пропускаю`);
  }

  console.log("→ Відгуки…");
  const testimonialCount = await prisma.testimonial.count();
  if (testimonialCount === 0) {
    await prisma.testimonial.createMany({
      data: DEFAULT_TESTIMONIALS.map((item) => ({ ...item, isPublished: true })),
    });
    console.log(`   додано ${DEFAULT_TESTIMONIALS.length}`);
  } else {
    console.log(`   вже є ${testimonialCount} записів — пропускаю`);
  }

  console.log("\n✓ Готово. Дані засіяно.");
}

main()
  .catch((error) => {
    console.error("\n✗ Помилка сіду:", error);
    console.error(
      "\nПідказка: перевірте, чи база піднята (`docker compose up -d db`) " +
        "і чи коректний DATABASE_URL у .env.",
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
