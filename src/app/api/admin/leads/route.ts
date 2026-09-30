/**
 * Список заявок для адмінки.
 *
 * Пагінація обовʼязкова: за рік роботи магазину заявок стають тисячі,
 * а адмінка мусить відкриватись за секунду. Пошук іде по імені та
 * телефону, причому номер нормалізується — адміністратор однаково
 * набере і `067…`, і `+38067…`.
 */

import type { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";

import { normalizeUaPhone } from "@/lib/phone";
import { describeDbError, prisma } from "@/lib/prisma";
import { leadStatusEnum } from "@/lib/validations";

import { fail, requireAdmin, toPositiveInt } from "@/app/api/_lib/http";
import { toLeadView } from "@/app/api/_lib/serialize";

export const dynamic = "force-dynamic";

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;

const LEAD_SOURCE_VALUES = ["QUIZ", "CALCULATOR", "CONTACT", "TELEGRAM"] as const;
type LeadSourceValue = (typeof LEAD_SOURCE_VALUES)[number];
type LeadStatusValue = z.infer<typeof leadStatusEnum>;

function isLeadSourceValue(value: string): value is LeadSourceValue {
  return (LEAD_SOURCE_VALUES as readonly string[]).includes(value);
}

function isLeadStatus(value: string): value is LeadStatusValue {
  return leadStatusEnum.safeParse(value).success;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const source = params.get("source");
    const query = params.get("q")?.trim() ?? "";
    const page = toPositiveInt(params.get("page"), 1);
    const perPage = Math.min(toPositiveInt(params.get("perPage"), DEFAULT_PER_PAGE), MAX_PER_PAGE);

    const where: Prisma.LeadWhereInput = {};
    // Невідомі значення фільтрів ігноруємо: краще показати всі заявки,
    // ніж порожній список через друкарську помилку в URL.
    if (status && isLeadStatus(status)) where.status = status;
    if (source && isLeadSourceValue(source)) where.source = source;

    if (query) {
      const conditions: Prisma.LeadWhereInput[] = [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ];
      const normalized = normalizeUaPhone(query);
      if (normalized) conditions.push({ phoneNormalized: { contains: normalized } });
      where.OR = conditions;
    }

    const [total, rows] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      leads: rows.map(toLeadView),
      total,
      page,
      perPage,
      pages: Math.max(1, Math.ceil(total / perPage)),
    });
  } catch (error) {
    console.error("[admin/leads] не вдалося прочитати заявки:", describeDbError(error));
    return fail(describeDbError(error), 500);
  }
}
