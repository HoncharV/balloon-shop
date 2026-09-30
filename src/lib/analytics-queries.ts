/**
 * Агрегація аналітики для адмінки.
 *
 * Чому `$queryRaw`, а не `groupBy`: для «унікальних відвідувачів» потрібен
 * `COUNT(DISTINCT …)`, якого в Prisma `groupBy` немає. Сирі запити тут
 * цілком безпечні — усі параметри передаються через плейсхолдери,
 * конкатенації рядків немає ніде.
 *
 * Часовий пояс: межі «сьогодні» рахуються в поясі сервера. У Docker
 * виставлено `TZ=Europe/Kyiv` (див. docker-compose.yml), тому для
 * українського магазину цифри збігаються з реальністю.
 */

import { prisma } from "./prisma";
import type { AnalyticsSummary, CountedRow } from "./analytics";

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysAgo(days: number): Date {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

type RawCounts = { visitors: bigint | number; page_views: bigint | number };

/**
 * Унікальні відвідувачі та перегляди за проміжок.
 * `since = null` означає «за весь час».
 */
async function pageViewCounts(since: Date | null): Promise<{ visitors: number; pageViews: number }> {
  const rows = since
    ? await prisma.$queryRaw<RawCounts[]>`
        SELECT COUNT(DISTINCT "visitorId") AS visitors, COUNT(*) AS page_views
        FROM "page_views"
        WHERE "createdAt" >= ${since}
      `
    : await prisma.$queryRaw<RawCounts[]>`
        SELECT COUNT(DISTINCT "visitorId") AS visitors, COUNT(*) AS page_views
        FROM "page_views"
      `;

  const row = rows[0];
  return {
    visitors: Number(row?.visitors ?? 0),
    pageViews: Number(row?.page_views ?? 0),
  };
}

async function leadCount(since: Date | null): Promise<number> {
  return prisma.lead.count(since ? { where: { createdAt: { gte: since } } } : undefined);
}

async function countedRows(
  rows: { key: string | null; count: number | bigint }[],
): Promise<CountedRow[]> {
  return rows
    .filter((row) => row.key !== null)
    .map((row) => ({ key: String(row.key), count: Number(row.count) }))
    .sort((a, b) => b.count - a.count);
}

/** Повний зріз для сторінки /admin/analytics і карток на дашборді. */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const today = startOfToday();
  const week = daysAgo(7);
  const month = daysAgo(30);

  const [todayCounts, weekCounts, monthCounts, totalCounts] = await Promise.all([
    pageViewCounts(today),
    pageViewCounts(week),
    pageViewCounts(month),
    pageViewCounts(null),
  ]);

  const [leadsToday, leadsWeek, leadsMonth, leadsTotal] = await Promise.all([
    leadCount(today),
    leadCount(week),
    leadCount(month),
    leadCount(null),
  ]);

  const [sourceRows, pageRows, eventRows] = await Promise.all([
    prisma.pageView.groupBy({
      by: ["source"],
      _count: { _all: true },
      orderBy: { _count: { source: "desc" } },
      take: 10,
    }),
    prisma.pageView.groupBy({
      by: ["path"],
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["name"],
      _count: { _all: true },
      orderBy: { _count: { name: "desc" } },
      take: 12,
    }),
  ]);

  const sources = await countedRows(sourceRows.map((row) => ({ key: row.source, count: row._count._all })));
  const topPages = await countedRows(pageRows.map((row) => ({ key: row.path, count: row._count._all })));
  const events = await countedRows(eventRows.map((row) => ({ key: row.name, count: row._count._all })));

  // Динаміка за 14 днів: два окремі агрегати + злиття в JS (дешевше
  // й читабельніше, ніж FULL OUTER JOIN у сирому SQL).
  const since14 = daysAgo(13);
  const [dailyViews, dailyLeads] = await Promise.all([
    prisma.$queryRaw<{ date: string; visitors: bigint | number; page_views: bigint | number }[]>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
             COUNT(DISTINCT "visitorId") AS visitors,
             COUNT(*) AS page_views
      FROM "page_views"
      WHERE "createdAt" >= ${since14}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<{ date: string; leads: bigint | number }[]>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
             COUNT(*) AS leads
      FROM "leads"
      WHERE "createdAt" >= ${since14}
      GROUP BY 1
      ORDER BY 1
    `,
  ]);

  const viewsByDate = new Map(
    dailyViews.map((row) => [row.date, { visitors: Number(row.visitors), pageViews: Number(row.page_views) }]),
  );
  const leadsByDate = new Map(dailyLeads.map((row) => [row.date, Number(row.leads)]));

  const daily: AnalyticsSummary["daily"] = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = daysAgo(offset);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const views = viewsByDate.get(key);
    daily.push({
      date: key,
      visitors: views?.visitors ?? 0,
      pageViews: views?.pageViews ?? 0,
      leads: leadsByDate.get(key) ?? 0,
    });
  }

  const conversion =
    totalCounts.visitors > 0 ? Math.round((leadsTotal / totalCounts.visitors) * 1000) / 10 : 0;

  return {
    visitorsToday: todayCounts.visitors,
    pageViewsToday: todayCounts.pageViews,
    visitors7d: weekCounts.visitors,
    pageViews7d: weekCounts.pageViews,
    visitors30d: monthCounts.visitors,
    pageViews30d: monthCounts.pageViews,
    visitorsTotal: totalCounts.visitors,
    pageViewsTotal: totalCounts.pageViews,
    leadsToday,
    leads7d: leadsWeek,
    leads30d: leadsMonth,
    leadsTotal,
    conversion,
    sources,
    topPages,
    events,
    daily,
  };
}

/** Порожній зріз — щоб дашборд рендерився, коли база недоступна. */
export function emptyAnalyticsSummary(): AnalyticsSummary {
  return {
    visitorsToday: 0,
    pageViewsToday: 0,
    visitors7d: 0,
    pageViews7d: 0,
    visitors30d: 0,
    pageViews30d: 0,
    visitorsTotal: 0,
    pageViewsTotal: 0,
    leadsToday: 0,
    leads7d: 0,
    leads30d: 0,
    leadsTotal: 0,
    conversion: 0,
    sources: [],
    topPages: [],
    events: [],
    daily: [],
  };
}
