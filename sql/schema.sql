-- ============================================================================
-- Balloon Magic — SQL-схема бази даних (PostgreSQL 16)
--
-- Це довідниковий DDL, еквівалентний `prisma/schema.prisma`.
-- Основний шлях встановлення — `npm run db:setup` (= `prisma db push` + seed):
-- так схема гарантовано збігається зі згенерованим Prisma Client.
-- Цей файл потрібен, якщо ви хочете підняти базу руками через psql.
--
-- Ідемпотентний: можна виконувати повторно.
-- ============================================================================

-- ------------------------------------------------------------- перелічення

DO $$ BEGIN
  CREATE TYPE "LeadSource" AS ENUM ('QUIZ', 'CALCULATOR', 'CONTACT', 'TELEGRAM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "HolidayType" AS ENUM
    ('BIRTHDAY', 'KIDS', 'GENDER_PARTY', 'WEDDING', 'CORPORATE', 'MATERNITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Audience" AS ENUM ('BOY', 'GIRL', 'MAN', 'WOMAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "GuestsRange" AS ENUM
    ('UP_TO_10', 'FROM_10_TO_20', 'FROM_20_TO_50', 'OVER_50');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BudgetRange" AS ENUM
    ('UP_TO_1000', 'FROM_1000_TO_3000', 'FROM_3000_TO_5000', 'OVER_5000');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DecorLevel" AS ENUM ('ECONOMY', 'STANDARD', 'PREMIUM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "GalleryCategory" AS ENUM ('BIRTHDAY', 'WEDDING', 'CORPORATE', 'KIDS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TrafficSource" AS ENUM
    ('DIRECT', 'TELEGRAM', 'INSTAGRAM', 'GOOGLE', 'FACEBOOK', 'TIKTOK', 'VIBER', 'YOUTUBE', 'REFERRAL', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------- контент

CREATE TABLE IF NOT EXISTS "site_settings" (
  "id"              INTEGER  NOT NULL DEFAULT 1,
  "phone"           TEXT     NOT NULL DEFAULT '+380678873333',
  "telegram"        TEXT     NOT NULL DEFAULT 'party_mode_kiev',
  "instagram"       TEXT     NOT NULL DEFAULT 'party_mode_kiev',
  "address"         TEXT     NOT NULL DEFAULT 'Лісовий проспект, 23Б, Київ, 02000',
  "mapEmbedUrl"     TEXT,
  "workingHours"    TEXT     NOT NULL DEFAULT 'Щодня 9:00 – 21:00',
  "discountPercent" INTEGER  NOT NULL DEFAULT 10,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "quiz_config" (
  "id"        INTEGER      NOT NULL DEFAULT 1,
  "data"      JSONB        NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quiz_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "packages" (
  "id"          TEXT         NOT NULL,
  "slug"        TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "priceFrom"   INTEGER      NOT NULL,
  "description" TEXT         NOT NULL,
  "features"    TEXT[]       NOT NULL,
  "imageUrl"    TEXT,
  "isPopular"   BOOLEAN      NOT NULL DEFAULT false,
  "sortOrder"   INTEGER      NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "packages_slug_key" ON "packages" ("slug");
CREATE INDEX IF NOT EXISTS "packages_isPublished_sortOrder_idx" ON "packages" ("isPublished", "sortOrder");

CREATE TABLE IF NOT EXISTS "gallery_items" (
  "id"          TEXT         NOT NULL,
  "title"       TEXT         NOT NULL,
  "description" TEXT,
  "category"    "GalleryCategory" NOT NULL,
  "imageUrl"    TEXT         NOT NULL,
  "sortOrder"   INTEGER      NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "gallery_items_category_sortOrder_idx" ON "gallery_items" ("category", "sortOrder");
CREATE INDEX IF NOT EXISTS "gallery_items_isPublished_idx" ON "gallery_items" ("isPublished");

CREATE TABLE IF NOT EXISTS "testimonials" (
  "id"          TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "photoUrl"    TEXT,
  "text"        TEXT         NOT NULL,
  "rating"      INTEGER      NOT NULL DEFAULT 5,
  "eventType"   TEXT,
  "isPublished" BOOLEAN      NOT NULL DEFAULT true,
  "sortOrder"   INTEGER      NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "testimonials_isPublished_sortOrder_idx" ON "testimonials" ("isPublished", "sortOrder");

-- --------------------------------------------------------------------- CRM

CREATE TABLE IF NOT EXISTS "leads" (
  "id"                  TEXT         NOT NULL,
  "name"                TEXT         NOT NULL,
  "phone"               TEXT         NOT NULL,
  "phoneNormalized"     TEXT         NOT NULL,
  "source"              "LeadSource" NOT NULL DEFAULT 'CONTACT',
  "status"              "LeadStatus" NOT NULL DEFAULT 'NEW',
  "holidayType"         "HolidayType",
  "audience"            "Audience",
  "guests"              "GuestsRange",
  "budget"              "BudgetRange",
  "decorLevel"          "DecorLevel",
  "delivery"            BOOLEAN,
  "eventDate"           DATE,
  "guestsCount"         INTEGER,
  "recommendedBalloons" INTEGER,
  "estimatedPrice"      INTEGER,
  "recommendedPackage"  TEXT,
  "comment"             TEXT,
  "quizAnswers"         JSONB,
  "adminNote"           TEXT,
  "visitorId"           TEXT,
  "ip"                  TEXT,
  "userAgent"           TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "leads_status_createdAt_idx" ON "leads" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "leads_createdAt_idx" ON "leads" ("createdAt");
CREATE INDEX IF NOT EXISTS "leads_source_idx" ON "leads" ("source");
CREATE INDEX IF NOT EXISTS "leads_phoneNormalized_idx" ON "leads" ("phoneNormalized");

-- --------------------------------------------------------------- аналітика

CREATE TABLE IF NOT EXISTS "visitors" (
  "id"          TEXT         NOT NULL,
  "visitorId"   TEXT         NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userAgent"   TEXT,
  "referrer"    TEXT,
  "source"      "TrafficSource" NOT NULL DEFAULT 'DIRECT',
  "country"     TEXT,
  "city"        TEXT,
  "pageViews"   INTEGER      NOT NULL DEFAULT 0,
  CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "visitors_visitorId_key" ON "visitors" ("visitorId");
CREATE INDEX IF NOT EXISTS "visitors_firstSeenAt_idx" ON "visitors" ("firstSeenAt");
CREATE INDEX IF NOT EXISTS "visitors_lastSeenAt_idx" ON "visitors" ("lastSeenAt");

CREATE TABLE IF NOT EXISTS "page_views" (
  "id"        TEXT         NOT NULL,
  "visitorId" TEXT         NOT NULL,
  "sessionId" TEXT         NOT NULL,
  "path"      TEXT         NOT NULL,
  "referrer"  TEXT,
  "source"    "TrafficSource" NOT NULL DEFAULT 'DIRECT',
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "page_views_createdAt_idx" ON "page_views" ("createdAt");
CREATE INDEX IF NOT EXISTS "page_views_path_idx" ON "page_views" ("path");
CREATE INDEX IF NOT EXISTS "page_views_visitorId_idx" ON "page_views" ("visitorId");

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id"        TEXT         NOT NULL,
  "name"      TEXT         NOT NULL,
  "visitorId" TEXT,
  "sessionId" TEXT,
  "path"      TEXT,
  "meta"      JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "analytics_events_name_createdAt_idx" ON "analytics_events" ("name", "createdAt");
CREATE INDEX IF NOT EXISTS "analytics_events_createdAt_idx" ON "analytics_events" ("createdAt");

-- ------------------------------------------------------------------ seed
-- Налаштування — один рядок з id = 1.
INSERT INTO "site_settings" ("id", "updatedAt")
VALUES (1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Конфігурацію квіза (таблиця quiz_config) свідомо НЕ додаємо сюди:
-- це великий JSON-документ, який краще створити сідом
-- (`npm run db:seed`), щоб не тримати його копію ще й у SQL.
-- Без рядка лендінг працює на типових значеннях
-- (`DEFAULT_QUIZ_CONFIG` у `src/data/quiz-config.ts`).
