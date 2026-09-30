"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Package, Plus, Trash2, Upload } from "lucide-react";

import { sendJson, uploadImage } from "@/app/admin/_lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

/**
 * Набір у вигляді, який отримує клієнтський компонент.
 *
 * Власний тип, а не `Package` з `@prisma/client`: клієнтський компонент не
 * має тягнути Prisma у браузерний бандл (див. `src/types/site.ts`).
 * `createdAt` / `updatedAt` тут не потрібні.
 */
export type PackageAdminItem = {
  id: string;
  slug: string;
  name: string;
  priceFrom: number;
  description: string;
  features: string[];
  imageUrl: string | null;
  isPopular: boolean;
  sortOrder: number;
  isPublished: boolean;
};

/** Формат, який приймає сервер. SVG тут свідомо відсутній. */
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/avif,image/gif";

/**
 * Тонкий пробіл між тисячами.
 *
 * `Intl` для uk-UA розділяє розряди нерозривним пробілом; його ширина
 * у великих цифрах виглядає як звичайна прогалина, тому всі пробіли
 * замінюємо на `\u202f` — він вужчий і не переносить число на новий рядок.
 */
const GROUP_SEPARATOR = "\u202f";
const priceFormatter = new Intl.NumberFormat("uk-UA");

function formatPrice(value: number): string {
  return priceFormatter.format(value).replace(/\s/g, GROUP_SEPARATOR);
}

type FormState = {
  name: string;
  priceFrom: string;
  description: string;
  features: string[];
  imageUrl: string;
  isPopular: boolean;
  isPublished: boolean;
  sortOrder: string;
};

function toFormState(item: PackageAdminItem): FormState {
  return {
    name: item.name,
    priceFrom: String(item.priceFrom),
    description: item.description,
    // Порожній список переваг показуємо одним порожнім рядком — інакше
    // адміністратор не бачив би, де взагалі вводити переваги.
    features: item.features.length > 0 ? [...item.features] : [""],
    imageUrl: item.imageUrl ?? "",
    isPopular: item.isPopular,
    isPublished: item.isPublished,
    sortOrder: String(item.sortOrder),
  };
}

/** Порожні переваги відкидаємо: у базі не місце для рядків-заготовок. */
function normalizeFeatures(features: string[]): string[] {
  return features.map((feature) => feature.trim()).filter((feature) => feature !== "");
}

/**
 * Різниця між формою та збереженим набором.
 *
 * Надсилаємо лише змінені поля: `packageUpdateSchema` побудована на
 * `.optional()`, тож зайве поле — це зайвий шанс отримати помилку
 * валідації на тому, що адміністратор не чіпав.
 */
function buildPayload(form: FormState, item: PackageAdminItem): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const name = form.name.trim();
  if (name !== item.name) payload.name = name;

  const priceFrom = Number.parseInt(form.priceFrom, 10);
  if (Number.isFinite(priceFrom) && priceFrom !== item.priceFrom) payload.priceFrom = priceFrom;

  const description = form.description.trim();
  if (description !== item.description) payload.description = description;

  const features = normalizeFeatures(form.features);
  if (features.join("\n") !== item.features.join("\n")) payload.features = features;

  const imageUrl = form.imageUrl.trim();
  if (imageUrl !== (item.imageUrl ?? "")) payload.imageUrl = imageUrl;

  if (form.isPopular !== item.isPopular) payload.isPopular = form.isPopular;
  if (form.isPublished !== item.isPublished) payload.isPublished = form.isPublished;

  const sortOrder = Number.parseInt(form.sortOrder, 10);
  if (Number.isFinite(sortOrder) && sortOrder !== item.sortOrder) payload.sortOrder = sortOrder;

  return payload;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function FormAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

/**
 * Керування наборами: назва, ціна «від», опис, переваги, фото, ознаки
 * «найпопулярніший» і «опубліковано», порядок на сайті.
 *
 * Набори не створюються й не видаляються з адмінки: їх рівно три
 * (START / STANDARD / PREMIUM), і до кожного прив'язаний `slug`, який
 * використовують калькулятор вартості та аналітика. Тому тут лише редагування.
 */
export function PackagesManager({ packages }: { packages: PackageAdminItem[] }) {
  const router = useRouter();

  const [editing, setEditing] = useState<PackageAdminItem | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function openEdit(item: PackageAdminItem) {
    setEditing(item);
    setForm(toFormState(item));
    setError(null);
    setFieldErrors({});
    setUploadPercent(null);
  }

  function closeDialog() {
    setEditing(null);
    setForm(null);
    setError(null);
    setFieldErrors({});
    setUploadPercent(null);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateFeature(index: number, value: string) {
    setForm((current) =>
      current
        ? { ...current, features: current.features.map((row, i) => (i === index ? value : row)) }
        : current,
    );
  }

  function moveFeature(index: number, delta: -1 | 1) {
    setForm((current) => {
      if (!current) return current;
      const target = index + delta;
      if (target < 0 || target >= current.features.length) return current;

      const features = [...current.features];
      const [moved] = features.splice(index, 1);
      features.splice(target, 0, moved);
      return { ...current, features };
    });
  }

  function removeFeature(index: number) {
    setForm((current) =>
      current ? { ...current, features: current.features.filter((_, i) => i !== index) } : current,
    );
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Скидаємо поле одразу: інакше той самий файл не вдасться вибрати
    // повторно (подія `change` не спрацює).
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploadPercent(0);
    const result = await uploadImage(file, setUploadPercent);
    setUploadPercent(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    update("imageUrl", result.url);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !editing) return;

    setError(null);
    setFieldErrors({});

    const payload = buildPayload(form, editing);
    if (Object.keys(payload).length === 0) {
      setError("Змін немає — нічого зберігати.");
      return;
    }

    setPending(true);
    const result = await sendJson(`/api/admin/packages/${editing.id}`, "PATCH", payload);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fields ?? {});
      return;
    }

    closeDialog();
    router.refresh();
  }

  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
        <span
          className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Package className="size-6" />
        </span>
        <p className="font-display text-lg font-semibold text-foreground">Наборів немає</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Набори START, STANDARD і PREMIUM створюються разом зі схемою бази даних — виконайте
          <code className="mx-1 font-mono text-xs text-foreground">npm run db:setup</code>
          і оновіть сторінку.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Ціни, описи й переваги наборів. Приховані набори на сайті не показуються, але лишаються тут.
        Набір можна редагувати, а створити чи видалити — ні: до трьох базових наборів прив’язані
        калькулятор вартості та аналітика.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {packages.map((item) => (
          <Card key={item.id} className="flex flex-col overflow-hidden">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <span
                  className="flex size-full items-center justify-center text-muted-foreground"
                  aria-hidden="true"
                >
                  <Package className="size-8" />
                </span>
              )}

              <span className="absolute top-3 left-3 flex flex-wrap gap-2">
                {item.isPopular ? <Badge variant="gold">Найпопулярніший</Badge> : null}
                {!item.isPublished ? <Badge variant="outline">Прихований</Badge> : null}
              </span>
            </div>

            <CardContent className="flex flex-1 flex-col gap-3 p-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className="font-display text-lg font-semibold text-foreground">{item.name}</p>
                  <span className="font-mono text-xs text-muted-foreground">{item.slug}</span>
                </div>
                <p className="font-display text-base font-semibold text-primary">
                  від {formatPrice(item.priceFrom)} грн
                </p>
              </div>

              <p className="line-clamp-3 text-sm text-muted-foreground">
                {item.description || "Без опису"}
              </p>

              <p className="text-xs text-muted-foreground">
                Переваг: {item.features.length} · порядок: {item.sortOrder}
              </p>

              <div className="mt-auto pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(item)}
                  aria-label={`Редагувати набір «${item.name}»`}
                >
                  Редагувати
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редагувати набір «{editing?.name}»</DialogTitle>
            <DialogDescription>
              Зміни з’являються на сайті одразу після збереження.
            </DialogDescription>
          </DialogHeader>

          {form && editing ? (
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="text-sm text-foreground">
                  Ідентифікатор набору:{" "}
                  <span className="font-mono text-xs font-medium">{editing.slug}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Показується, але не редагується. Цей код використовують калькулятор вартості та
                  аналітика як стабільний ідентифікатор — після зміни зіставлення зі статистикою
                  зламалося б.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="package-name">Назва</Label>
                  <Input
                    id="package-name"
                    type="text"
                    value={form.name}
                    required
                    placeholder="STANDARD"
                    onChange={(event) => update("name", event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Від 2 до 40 символів.</p>
                  <FieldError message={fieldErrors.name} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="package-price">Ціна «від», грн</Label>
                  <Input
                    id="package-price"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1000000}
                    value={form.priceFrom}
                    required
                    onChange={(event) => update("priceFrom", event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Показується на сайті як «від {formatPrice(Number(form.priceFrom) || 0)} грн».
                  </p>
                  <FieldError message={fieldErrors.priceFrom} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-description">Опис</Label>
                <Textarea
                  id="package-description"
                  value={form.description}
                  required
                  placeholder="Що входить у набір — 2–3 речення"
                  onChange={(event) => update("description", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Від 10 до 600 символів. Показується на картці набору.
                </p>
                <FieldError message={fieldErrors.description} />
              </div>

              <div className="space-y-3">
                <Label htmlFor="package-feature-0">Переваги</Label>
                <p className="text-xs text-muted-foreground">
                  Кожен рядок — один пункт зі списку на картці набору. Порожні рядки при збереженні
                  відкидаються, максимум 20 переваг.
                </p>

                <div className="space-y-2">
                  {form.features.map((feature, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Input
                          id={`package-feature-${index}`}
                          type="text"
                          value={feature}
                          aria-label={`Перевага ${index + 1}`}
                          placeholder="Наприклад: арка з кульок 2 м"
                          onChange={(event) => updateFeature(index, event.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          disabled={index === 0}
                          onClick={() => moveFeature(index, -1)}
                          aria-label={`Перемістити перевагу ${index + 1} вгору`}
                        >
                          <ArrowUp className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          disabled={index === form.features.length - 1}
                          onClick={() => moveFeature(index, 1)}
                          aria-label={`Перемістити перевагу ${index + 1} вниз`}
                        >
                          <ArrowDown className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removeFeature(index)}
                          aria-label={`Прибрати перевагу ${index + 1}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                      <FieldError message={fieldErrors[`features.${index}`]} />
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => update("features", [...form.features, ""])}
                >
                  <Plus className="size-5" aria-hidden="true" />
                  Додати перевагу
                </Button>

                <FieldError message={fieldErrors.features} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-image">Фото набору</Label>
                <Input
                  id="package-image"
                  type="text"
                  value={form.imageUrl}
                  placeholder="/images/packages/standard.svg або https://…"
                  onChange={(event) => update("imageUrl", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Адреса вже розміщеного фото, напр. /images/packages/standard.svg. Якщо поле
                  порожнє, фото на картці не буде.
                </p>
                <FieldError message={fieldErrors.imageUrl} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="package-file">Завантажити нове фото</Label>
                <Input
                  id="package-file"
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileChange}
                  className="h-auto py-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
                />
                <p className="text-xs text-muted-foreground">
                  PNG, JPEG, WebP, AVIF або GIF до 5 МБ. SVG не приймається: такий файл може містити
                  скрипт, а фото відкриваються з того самого домену, що й сайт.
                </p>

                {uploadPercent !== null ? (
                  <div className="space-y-1.5">
                    <Progress value={uploadPercent} />
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Upload className="size-3.5" aria-hidden="true" />
                      Завантаження: {uploadPercent} %
                    </p>
                  </div>
                ) : null}
              </div>

              {form.imageUrl ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <img
                    src={form.imageUrl}
                    alt="Прев’ю фото набору"
                    className="h-40 w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="package-order">Порядок на сайті</Label>
                  <Input
                    id="package-order"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={9999}
                    value={form.sortOrder}
                    onChange={(event) => update("sortOrder", event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Менше число — лівіше в списку.
                  </p>
                  <FieldError message={fieldErrors.sortOrder} />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <span className="flex text-sm font-medium leading-none text-foreground">
                    Показ на сайті
                  </span>
                  <label className="flex items-center gap-2.5 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.isPopular}
                      onChange={(event) => update("isPopular", event.target.checked)}
                      className="size-5 rounded border-2 border-input accent-primary"
                    />
                    <span>Найпопулярніший — картка виділяється кольором</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(event) => update("isPublished", event.target.checked)}
                      className="size-5 rounded border-2 border-input accent-primary"
                    />
                    <span>Опубліковано — набір показується на сайті</span>
                  </label>
                  <FieldError message={fieldErrors.isPopular} />
                  <FieldError message={fieldErrors.isPublished} />
                </div>
              </div>

              {error ? <FormAlert message={error} /> : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>
                  Скасувати
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Зберігаємо…" : "Зберегти зміни"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
