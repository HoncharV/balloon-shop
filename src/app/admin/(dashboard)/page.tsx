import Link from "next/link";
import { CalendarCheck, Inbox, Percent, Users } from "lucide-react";

import { toLeadView } from "@/app/admin/_lib/views";
import { BarChart } from "@/components/admin/bar-chart";
import { DatabaseAlert } from "@/components/admin/database-alert";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnalyticsSummary } from "@/lib/analytics";
import { emptyAnalyticsSummary, getAnalyticsSummary } from "@/lib/analytics-queries";
import { formatUaPhone } from "@/lib/phone";
import { describeDbError, prisma } from "@/lib/prisma";

import type { LeadView } from "@/types/site";

const dateTimeFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Kyiv",
});

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

/** `2025-03-07` → `07.03` — підпис під стовпчиком. */
function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  if (!month || !day) return isoDate;
  return `${day}.${month}`;
}

/**
 * Дашборд: ключові цифри, динаміка за два тижні та останні заявки.
 *
 * Читання з бази обгорнуто в `try/catch`: якщо PostgreSQL ще не піднятий,
 * сторінка показує `DatabaseAlert` і нулі, а не падає з 500 — адмінка
 * мусить відкриватися одразу після розгортання.
 */
export default async function AdminDashboardPage() {
  let summary: AnalyticsSummary = emptyAnalyticsSummary();
  let leads: LeadView[] = [];
  let dbError: string | null = null;

  try {
    summary = await getAnalyticsSummary();
  } catch (error) {
    dbError = describeDbError(error);
  }

  try {
    const rows = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    leads = rows.map(toLeadView);
  } catch (error) {
    dbError = dbError ?? describeDbError(error);
  }

  const dailySeries = summary.daily.map((day) => ({
    label: shortDate(day.date),
    value: day.visitors,
  }));

  return (
    <div className="space-y-6">
      {dbError ? <DatabaseAlert message={dbError} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Відвідувачі сьогодні"
          value={summary.visitorsToday}
          hint={`${summary.pageViewsToday} переглядів сторінок`}
          icon={Users}
          accent="pink"
        />
        <StatCard
          label="Заявки сьогодні"
          value={summary.leadsToday}
          hint={`${summary.leads7d} за останні 7 днів`}
          icon={Inbox}
          accent="blue"
        />
        <StatCard
          label="Всього лідів"
          value={summary.leadsTotal}
          hint={`${summary.visitorsTotal} відвідувачів за весь час`}
          icon={CalendarCheck}
          accent="gold"
        />
        <StatCard
          label="Конверсія"
          value={`${summary.conversion} %`}
          hint="Відвідувачі, які лишили заявку"
          icon={Percent}
          accent="green"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Динаміка за 14 днів</CardTitle>
          <CardDescription>Унікальні відвідувачі сайту за кожен день.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={dailySeries} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Останні заявки</CardTitle>
            <CardDescription>П’ять найсвіжіших звернень із квіза й калькулятора.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link href="/admin/leads">Усі заявки</Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ім’я</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Заявок поки немає
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatUaPhone(lead.phone)}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatDateTime(lead.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
