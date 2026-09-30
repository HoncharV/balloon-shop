import { AlertTriangle } from "lucide-react";

/**
 * Пояснення замість помилки 500, коли база даних недоступна.
 *
 * Адмінка мусить відкриватися одразу після `git clone`, ще до
 * `docker compose up -d db`. Замість падіння сторінка рендерить цей блок
 * із конкретними командами, які треба виконати.
 *
 * Серверний компонент: без хуків і без звернень до браузера.
 */
export function DatabaseAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-5"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 space-y-3 text-sm">
          <p className="font-semibold text-foreground">База даних недоступна</p>
          <p className="text-muted-foreground">{message}</p>

          <div className="space-y-1 rounded-xl border border-border bg-white p-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Що зробити
            </p>
            <code className="block font-mono text-xs text-foreground">docker compose up -d db</code>
            <code className="block font-mono text-xs text-foreground">npm run db:setup</code>
          </div>

          <p className="text-muted-foreground">
            Після цього оновіть сторінку. Дані показуватимуться, щойно PostgreSQL відповість —
            решта адмінки продовжує працювати навіть без нього.
          </p>
        </div>
      </div>
    </div>
  );
}
