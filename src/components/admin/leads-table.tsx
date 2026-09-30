"use client";

import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";

import { sendJson } from "@/app/admin/_lib/api-client";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  labelOfSource,
  type LeadSourceKey,
  type LeadStatusKey,
} from "@/lib/constants";
import { formatUaPhone, phoneHref } from "@/lib/phone";
import { resolveOptionLabel } from "@/lib/quiz-config";

import type { QuizConfigData } from "@/data/quiz-config";
import type { LeadView } from "@/types/site";

/** Значення для пункту «Усі» — Radix Select не приймає порожній рядок. */
const ALL = "all";

const dateTimeFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  // Фіксований пояс: інакше сервер і браузер могли б показати різний час
  // і React скаржився б на розбіжність під час гідратації.
  timeZone: "Europe/Kyiv",
});

/** `YYYY-MM-DD` → `дд.мм.рррр` без участі `Date`, щоб не зсунути день. */
function formatDateOnly(isoDate: string | null): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  if (!year || !month || !day) return "—";
  return `${day}.${month}.${year}`;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

function pluralizeLeads(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "заявка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заявки";
  return "заявок";
}

function TableAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Таблиця заявок: фільтри в адресі сторінки, зміна статусу одним рухом,
 * деталі кожної заявки в діалозі.
 *
 * Фільтри живуть у `?status=&source=&q=&page=`, тому посилання на вибірку
 * можна зберегти чи надіслати колезі.
 *
 * Підписи варіантів беруться не з констант, а з конфігурації квіза: після
 * перейменування варіанта в адмінці власник має бачити в заявці ту саму
 * назву, що й на сайті. `resolveOptionLabel` шукає підпис і серед вимкнених
 * варіантів, і в довіднику типових значень — тому старі заявки показують
 * зрозумілу назву навіть після видалення варіанта.
 */
export function LeadsTable({
  leads,
  config,
  status,
  source,
  q,
  page,
  pages,
  total,
}: {
  leads: LeadView[];
  /** Поточна конфігурація квіза — джерело підписів для збережених заявок. */
  config: QuizConfigData;
  status?: string;
  source?: string;
  q?: string;
  page: number;
  pages: number;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(q ?? "");
  const [selected, setSelected] = useState<LeadView | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Кнопка «Назад» у браузері змінює `q`, а поле вводу має це показати.
  useEffect(() => {
    setSearch(q ?? "");
  }, [q]);

  function applyParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.push(query ? `/admin/leads?${query}` : "/admin/leads");
  }

  function openLead(lead: LeadView) {
    setSelected(lead);
    setNote(lead.adminNote ?? "");
    setError(null);
  }

  function stopRowClick(event: MouseEvent) {
    event.stopPropagation();
  }

  async function updateLead(id: string, payload: Record<string, unknown>): Promise<boolean> {
    setPendingId(id);
    setError(null);
    const result = await sendJson(`/api/admin/leads/${id}`, "PATCH", payload);
    setPendingId(null);

    if (!result.ok) {
      setError(result.message);
      return false;
    }

    router.refresh();
    return true;
  }

  async function saveNote() {
    if (!selected) return;
    if (await updateLead(selected.id, { adminNote: note })) setSelected(null);
  }

  async function deleteLead(id: string) {
    if (!window.confirm("Видалити цю заявку назавжди? Скасувати дію неможливо.")) return;

    setPendingId(id);
    setError(null);
    const result = await sendJson(`/api/admin/leads/${id}`, "DELETE");
    setPendingId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSelected(null);
    router.refresh();
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyParams({ q: search.trim(), page: null });
  }

  const hasFilters = Boolean(status || source || q);
  const dialogPending = pendingId !== null && pendingId === selected?.id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-white p-4">
        <div className="space-y-2">
          <Label htmlFor="leads-status">Статус</Label>
          <Select
            value={status || ALL}
            onValueChange={(value) =>
              applyParams({ status: value === ALL ? null : value, page: null })
            }
          >
            <SelectTrigger id="leads-status" className="w-44">
              <SelectValue placeholder="Усі статуси" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Усі статуси</SelectItem>
              {(Object.keys(LEAD_STATUS_LABELS) as LeadStatusKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {LEAD_STATUS_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="leads-source">Джерело</Label>
          <Select
            value={source || ALL}
            onValueChange={(value) =>
              applyParams({ source: value === ALL ? null : value, page: null })
            }
          >
            <SelectTrigger id="leads-source" className="w-52">
              <SelectValue placeholder="Усі джерела" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Усі джерела</SelectItem>
              {(Object.keys(LEAD_SOURCE_LABELS) as LeadSourceKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {LEAD_SOURCE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <form className="space-y-2" onSubmit={handleSearch}>
          <Label htmlFor="leads-search">Пошук за ім’ям або телефоном</Label>
          <div className="flex gap-2">
            <Input
              id="leads-search"
              type="search"
              value={search}
              placeholder="Олена або 067…"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button type="submit" variant="outline" aria-label="Знайти заявки">
              <Search className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </form>

        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              router.push("/admin/leads");
            }}
          >
            Скинути фільтри
          </Button>
        ) : null}
      </div>

      {error && selected === null ? <TableAlert message={error} /> : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ім’я</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Тип свята</TableHead>
              <TableHead>Бюджет</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Джерело</TableHead>
              <TableHead>Створено</TableHead>
              <TableHead>
                <span className="sr-only">Дії</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  {hasFilters
                    ? "За цими фільтрами заявок немає. Спробуйте змінити умови пошуку."
                    : "Заявок поки немає. Щойно хтось заповнить квіз або форму, заявка з’явиться тут."}
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => openLead(lead)}
                >
                  <TableCell className="font-medium">{lead.name}</TableCell>

                  <TableCell onClick={stopRowClick}>
                    <a
                      href={phoneHref(lead.phone)}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {formatUaPhone(lead.phone)}
                    </a>
                  </TableCell>

                  <TableCell>{resolveOptionLabel(config, "HOLIDAY", lead.holidayType)}</TableCell>
                  <TableCell>{resolveOptionLabel(config, "BUDGET", lead.budget)}</TableCell>
                  <TableCell className="tabular-nums">{formatDateOnly(lead.eventDate)}</TableCell>

                  <TableCell onClick={stopRowClick}>
                    <Select
                      value={lead.status}
                      disabled={pendingId === lead.id}
                      onValueChange={(value) => void updateLead(lead.id, { status: value })}
                    >
                      <SelectTrigger
                        className="h-9 w-36"
                        aria-label={`Статус заявки ${lead.name}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(LEAD_STATUS_LABELS) as LeadStatusKey[]).map((key) => (
                          <SelectItem key={key} value={key}>
                            {LEAD_STATUS_LABELS[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>{labelOfSource(lead.source)}</TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatDateTime(lead.createdAt)}
                  </TableCell>

                  <TableCell onClick={stopRowClick}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openLead(lead)}
                      aria-label={`Деталі заявки ${lead.name}`}
                    >
                      Деталі
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total === 0 ? "Нічого не знайдено" : `Усього ${total} ${pluralizeLeads(total)}`}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => applyParams({ page: String(page - 1) })}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Назад
          </Button>
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            Сторінка {page} з {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => applyParams({ page: String(page + 1) })}
          >
            Вперед
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.name ?? "Заявка"}</DialogTitle>
            <DialogDescription>
              Деталі заявки з джерела «{labelOfSource(selected?.source)}». Зміни статусу й нотатки
              зберігаються на сервері одразу.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Телефон">
                  <a
                    href={phoneHref(selected.phone)}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {formatUaPhone(selected.phone)}
                  </a>
                </Field>
                <Field label="Статус">
                  <StatusBadge status={selected.status} />
                </Field>
                <Field label="Джерело">{labelOfSource(selected.source)}</Field>
                <Field label="Тип свята">
                  {resolveOptionLabel(config, "HOLIDAY", selected.holidayType)}
                </Field>
                <Field label="Для кого">
                  {resolveOptionLabel(config, "AUDIENCE", selected.audience)}
                </Field>
                <Field label="Гостей">{resolveOptionLabel(config, "GUESTS", selected.guests)}</Field>
                <Field label="Бюджет">{resolveOptionLabel(config, "BUDGET", selected.budget)}</Field>
                <Field label="Рівень оформлення">
                  {resolveOptionLabel(config, "DECOR", selected.decorLevel)}
                </Field>
                <Field label="Доставка">
                  {selected.delivery === null ? "—" : selected.delivery ? "Потрібна" : "Не потрібна"}
                </Field>
                <Field label="Дата свята">{formatDateOnly(selected.eventDate)}</Field>
                <Field label="Розрахунок гостей">
                  {selected.guestsCount === null ? "—" : selected.guestsCount}
                </Field>
                <Field label="Рекомендовані кульки">
                  {selected.recommendedBalloons === null ? "—" : selected.recommendedBalloons}
                </Field>
                <Field label="Орієнтовна ціна">
                  {selected.estimatedPrice === null ? "—" : `${selected.estimatedPrice} ₴`}
                </Field>
                <Field label="Рекомендований набір">
                  {selected.recommendedPackage ?? "—"}
                </Field>
                <Field label="Створено">{formatDateTime(selected.createdAt)}</Field>
                <Field label="Оновлено">{formatDateTime(selected.updatedAt)}</Field>
              </dl>

              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Коментар клієнта
                </p>
                <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm whitespace-pre-line text-foreground">
                  {selected.comment?.trim() ? selected.comment : "Клієнт не залишив коментаря"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-note">Нотатка адміністратора</Label>
                <Textarea
                  id="lead-note"
                  value={note}
                  placeholder="Наприклад: домовились на суботу, 14:00"
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>

              {error ? <TableAlert message={error} /> : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={dialogPending}
              onClick={() => {
                if (selected) void deleteLead(selected.id);
              }}
            >
              <Trash2 className="size-5" aria-hidden="true" />
              Видалити заявку
            </Button>
            <Button type="button" disabled={dialogPending} onClick={() => void saveNote()}>
              {dialogPending ? "Зберігаємо…" : "Зберегти нотатку"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
