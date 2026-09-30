import { AnalyticsView } from "@/components/admin/analytics-view";
import { DatabaseAlert } from "@/components/admin/database-alert";
import type { AnalyticsSummary } from "@/lib/analytics";
import { emptyAnalyticsSummary, getAnalyticsSummary } from "@/lib/analytics-queries";
import { describeDbError } from "@/lib/prisma";

/**
 * Аналітика: власний лічильник відвідувань, заявки, джерела трафіку й
 * події квіза.
 *
 * Якщо база недоступна — показуємо порожній зріз і пояснення замість
 * помилки 500.
 */
export default async function AdminAnalyticsPage() {
  let summary: AnalyticsSummary = emptyAnalyticsSummary();
  let dbError: string | null = null;

  try {
    summary = await getAnalyticsSummary();
  } catch (error) {
    dbError = describeDbError(error);
  }

  return (
    <div className="space-y-6">
      {dbError ? <DatabaseAlert message={dbError} /> : null}
      <AnalyticsView summary={summary} />
    </div>
  );
}
