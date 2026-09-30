import { BarChart3, Eye, Inbox, Megaphone, Percent, Users } from "lucide-react";

import { BarChart } from "@/components/admin/bar-chart";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { percentage, type AnalyticsSummary, type CountedRow } from "@/lib/analytics";
import { ANALYTICS_EVENT_LABELS, TRAFFIC_SOURCE_LABELS } from "@/lib/constants";

/** `2025-03-07` → `07.03` — підпис під стовпчиком. */
function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  if (!month || !day) return isoDate;
  return `${day}.${month}`;
}

/**
 * Список значень із часткою у відсотках.
 *
 * Порожній список показує пояснення, а не нулі: краще сказати «даних
 * поки немає», ніж намалювати рядок із 0 %, який виглядає як збій.
 */
function CountedList({
  rows,
  labels,
  total,
  emptyText,
}: {
  rows: CountedRow[];
  labels: Record<string, string>;
  total: number;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const share = percentage(row.count, total);

        return (
          <li key={row.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-foreground">{labels[row.key] ?? row.key}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.count} · {share} %
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-brand-blue"
                style={{ width: `${Math.min(100, Math.max(share, 2))}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Сторінка аналітики: відвідувачі, перегляди, заявки, джерела трафіку,
 * популярні сторінки та події квіза.
 *
 * Серверний компонент — усі цифри вже прийшли як `AnalyticsSummary`.
 */
export function AnalyticsView({ summary }: { summary: AnalyticsSummary }) {
  const sourceTotal = summary.sources.reduce((sum, row) => sum + row.count, 0);
  const pageTotal = summary.topPages.reduce((sum, row) => sum + row.count, 0);
  const quizViews = summary.events.find((row) => row.key === "quiz_view")?.count ?? 0;
  const dailySeries = summary.daily.map((day) => ({
    label: shortDate(day.date),
    value: day.visitors,
  }));

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Відвідувачі</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Сьогодні"
            value={summary.visitorsToday}
            hint={`${summary.pageViewsToday} переглядів сторінок`}
            icon={Users}
            accent="pink"
          />
          <StatCard
            label="За 7 днів"
            value={summary.visitors7d}
            hint={`${summary.pageViews7d} переглядів сторінок`}
            icon={Users}
            accent="blue"
          />
          <StatCard
            label="За 30 днів"
            value={summary.visitors30d}
            hint={`${summary.pageViews30d} переглядів сторінок`}
            icon={Users}
            accent="gold"
          />
          <StatCard
            label="За весь час"
            value={summary.visitorsTotal}
            hint={`${summary.pageViewsTotal} переглядів сторінок`}
            icon={Eye}
            accent="green"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Заявки</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Заявок сьогодні" value={summary.leadsToday} icon={Inbox} accent="pink" />
          <StatCard label="Заявок за 7 днів" value={summary.leads7d} icon={Inbox} accent="blue" />
          <StatCard label="Заявок за 30 днів" value={summary.leads30d} icon={Inbox} accent="gold" />
          <StatCard
            label="Всього заявок"
            value={summary.leadsTotal}
            hint={`Конверсія: ${summary.conversion} %`}
            icon={Percent}
            accent="green"
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Динаміка за 14 днів</CardTitle>
          <CardDescription>Унікальні відвідувачі за кожен день.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={dailySeries} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Джерела трафіку</CardTitle>
            <CardDescription>Звідки прийшли відвідувачі за весь час.</CardDescription>
          </CardHeader>
          <CardContent>
            <CountedList
              rows={summary.sources}
              labels={TRAFFIC_SOURCE_LABELS}
              total={sourceTotal}
              emptyText="Даних поки немає"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Найпопулярніші сторінки</CardTitle>
            <CardDescription>Скільки разів відкривали кожну адресу.</CardDescription>
          </CardHeader>
          <CardContent>
            <CountedList
              rows={summary.topPages}
              labels={{}}
              total={pageTotal}
              emptyText="Даних поки немає"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Події на сайті</CardTitle>
          <CardDescription>
            Квіз відкривали{" "}
            <span className="font-semibold text-foreground">{quizViews}</span>{" "}
            {quizViews === 1 ? "раз" : "разів"} — саме стільки разів показувався блок із квізом.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <Megaphone className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Перегляди квіза</p>
              <p className="font-display text-xl font-semibold text-foreground">{quizViews}</p>
            </div>
          </div>

          <CountedList
            rows={summary.events}
            labels={ANALYTICS_EVENT_LABELS}
            total={summary.events.reduce((sum, row) => sum + row.count, 0)}
            emptyText="Даних поки немає"
          />
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <BarChart3 className="size-4" aria-hidden="true" />
        Лічильник власний: жодних зовнішніх сервісів аналітики на сайті немає.
      </p>
    </div>
  );
}
