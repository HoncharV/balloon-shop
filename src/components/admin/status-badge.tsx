import { Badge } from "@/components/ui/badge";
import { labelOfStatus } from "@/lib/constants";

/**
 * Статус заявки кольором: «Новий» — рожевий, «В роботі» — блакитний,
 * «Виконано» — зелений.
 *
 * Невідоме значення не ламає рендер: `labelOfStatus` віддає «—», а бейдж
 * лишається нейтральним.
 */
export function StatusBadge({ status }: { status: string }) {
  if (status === "IN_PROGRESS") {
    return <Badge variant="secondary">{labelOfStatus(status)}</Badge>;
  }

  if (status === "DONE") {
    return <Badge variant="success">{labelOfStatus(status)}</Badge>;
  }

  if (status === "NEW") {
    return <Badge variant="default">{labelOfStatus(status)}</Badge>;
  }

  return <Badge variant="outline">{labelOfStatus(status)}</Badge>;
}
