# ============================================================================
# Balloon Magic — production-образ (Next.js 15 standalone + Prisma)
#
# Збірка:      docker build -t balloon-magic .
# Запуск:      docker run --rm -p 3000:3000 --env-file .env balloon-magic
#
# ВАЖЛИВО: образ НЕ містить Postgres і не застосовує міграції автоматично.
#   docker compose up -d db          # підняти базу
#   npm run db:setup                 # створити схему + засіяти (з хоста)
#   docker compose --profile full up -d
# ============================================================================

# syntax=docker/dockerfile:1

# --------------------------------------------------------------------- deps
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ------------------------------------------------------------------ builder
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma генерує клієнт під час збірки. Реальна БД для цього не потрібна —
# лише коректний (синтаксично) DATABASE_URL.
ARG DATABASE_URL="postgresql://balloon:balloon@localhost:5432/balloon_magic?schema=public"
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

# ------------------------------------------------------------------- runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -g 1001 nodejs \
 && useradd -u 1001 -g nodejs --create-home nextjs

# Статичні файли та standalone-сервер
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma Client + query engine потрібні в рантаймі
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Тека для фото, завантажених з адмінки
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
