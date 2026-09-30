import type { Prisma } from "@prisma/client";

import { toLeadView } from "@/app/admin/_lib/views";
import { DatabaseAlert } from "@/components/admin/database-alert";
import { LeadsTable } from "@/components/admin/leads-table";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  type LeadSourceKey,
  type LeadStatusKey,
} from "@/lib/constants";
import { getQuizConfig } from "@/lib/content";
import { normalizeUaPhone } from "@/lib/phone";
import { describeDbError, prisma } from "@/lib/prisma";

import type { QuizConfigData } from "@/data/quiz-config";
import type { LeadView } from "@/types/site";

const PER_PAGE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * Список заявок із фільтрами, пошуком і пагінацією.
 *
 * У Next 15 `searchParams` — це `Promise`, тому його треба розгорнути.
 * Невідомі значення фільтрів ігноруються: краще показати всі заявки, ніж
 * порожній список через друкарську помилку в адресі.
 */
export default async function AdminLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const status = firstParam(params.status).trim();
  const source = firstParam(params.source).trim();
  const q = firstParam(params.q).trim();
  const page = Math.max(1, Number.parseInt(firstParam(params.page), 10) || 1);

  const where: Prisma.LeadWhereInput = {};
  if (status && status in LEAD_STATUS_LABELS) where.status = status as LeadStatusKey;
  if (source && source in LEAD_SOURCE_LABELS) where.source = source as LeadSourceKey;

  if (q) {
    const conditions: Prisma.LeadWhereInput[] = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
    // Адміністратор однаково набере і «067…», і «+38067…», тому номер
    // додатково шукаємо в нормалізованому вигляді.
    const normalized = normalizeUaPhone(q);
    if (normalized) conditions.push({ phoneNormalized: { contains: normalized } });
    where.OR = conditions;
  }

  let leads: LeadView[] = [];
  let total = 0;
  let dbError: string | null = null;

  try {
    const [rows, count] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      prisma.lead.count({ where }),
    ]);
    leads = rows.map(toLeadView);
    total = count;
  } catch (error) {
    dbError = describeDbError(error);
  }

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Підписи варіантів у заявках беруться з конфігурації квіза, а не з
  // констант: після перейменування варіанта в адмінці власник має бачити
  // в заявці ту саму назву, що й на сайті.
  const config: QuizConfigData = await getQuizConfig();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Усі заявки з квіза, калькулятора й форми контактів. Вибір фільтрів зберігається в адресі
        сторінки — таке посилання можна надіслати колезі.
      </p>

      {dbError ? <DatabaseAlert message={dbError} /> : null}

      <LeadsTable
        leads={leads}
        config={config}
        status={status || undefined}
        source={source || undefined}
        q={q || undefined}
        page={page}
        pages={pages}
        total={total}
      />
    </div>
  );
}
