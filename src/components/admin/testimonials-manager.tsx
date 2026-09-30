"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Upload } from "lucide-react";

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
import { cn } from "@/lib/utils";

import type { TestimonialView } from "@/types/site";

/**
 * Відгуки в адмінці: до `TestimonialView` додано ознаку публікації —
 * на сайт неопубліковані відгуки не потрапляють, тому в публічному типі
 * цього поля немає.
 */
export type TestimonialAdminItem = TestimonialView & {
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Формат, який приймає сервер. SVG тут свідомо відсутній. */
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/avif,image/gif";
const RATING_VALUES = [1, 2, 3, 4, 5];

type FormState = {
  name: string;
  text: string;
  rating: number;
  eventType: string;
  photoUrl: string;
  sortOrder: string;
  isPublished: boolean;
};

function emptyForm(): FormState {
  return {
    name: "",
    text: "",
    rating: 5,
    eventType: "",
    photoUrl: "",
    sortOrder: "0",
    isPublished: true,
  };
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

/** Зірки для показу оцінки у списку. */
function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Оцінка ${rating} з 5`}>
      {RATING_VALUES.map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          className={cn(
            "size-4",
            value <= rating ? "fill-accent text-accent" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

/**
 * Керування відгуками: ім’я, текст, оцінка, тип події, фото, порядок і
 * публікація. Один діалог і для створення, і для редагування.
 */
export function TestimonialsManager({ items }: { items: TestimonialAdminItem[] }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setUploadPercent(null);
    setOpen(true);
  }

  function openEdit(item: TestimonialAdminItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      text: item.text,
      rating: item.rating,
      eventType: item.eventType,
      photoUrl: item.photoUrl ?? "",
      sortOrder: String(item.sortOrder),
      isPublished: item.isPublished,
    });
    setError(null);
    setUploadPercent(null);
    setOpen(true);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Поле скидаємо одразу, інакше повторний вибір того самого файлу не
    // викликав би подію `change`.
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

    setForm((current) => ({ ...current, photoUrl: result.url }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Вкажіть, будь ласка, ім’я автора відгуку");
      return;
    }
    if (form.text.trim().length < 10) {
      setError("Відгук занадто короткий — потрібно щонайменше 10 символів");
      return;
    }

    const payload = {
      name: form.name.trim(),
      text: form.text.trim(),
      rating: form.rating,
      eventType: form.eventType.trim(),
      // Порожній рядок означає «без фото» — на сайті такий відгук просто
      // показується без зображення.
      photoUrl: form.photoUrl.trim(),
      sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
      isPublished: form.isPublished,
    };

    setPending(true);
    const result = editingId
      ? await sendJson(`/api/admin/testimonials/${editingId}`, "PATCH", payload)
      : await sendJson("/api/admin/testimonials", "POST", payload);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function handleDelete(item: TestimonialAdminItem) {
    const confirmed = window.confirm(
      `Видалити відгук від «${item.name}»? Скасувати цю дію неможливо.`,
    );
    if (!confirmed) return;

    setListError(null);
    const result = await sendJson(`/api/admin/testimonials/${item.id}`, "DELETE");
    if (!result.ok) {
      setListError(result.message);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length === 0
            ? "Відгуків ще немає."
            : `Усього відгуків: ${items.length}. Неопубліковані на сайті не показуються.`}
        </p>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-5" aria-hidden="true" />
          Додати відгук
        </Button>
      </div>

      {listError && !open ? <FormAlert message={listError} /> : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
          <span
            className="flex size-12 items-center justify-center rounded-2xl bg-accent/20 text-[#8a6b00]"
            aria-hidden="true"
          >
            <Star className="size-6" />
          </span>
          <p className="font-display text-lg font-semibold text-foreground">Відгуків ще немає</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Додайте перший відгук клієнта — він з’явиться в блоці «Відгуки» на сайті.
          </p>
          <Button type="button" variant="outline" onClick={openCreate}>
            <Plus className="size-5" aria-hidden="true" />
            Додати відгук
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="h-full">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt=""
                      loading="lazy"
                      className="size-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary/25 font-display text-lg font-semibold text-[#1c6b8f]"
                      aria-hidden="true"
                    >
                      {item.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                    <RatingStars rating={item.rating} />
                    {item.eventType ? (
                      <p className="truncate text-xs text-muted-foreground">{item.eventType}</p>
                    ) : null}
                  </div>

                  <span className="shrink-0">
                    {item.isPublished ? (
                      <Badge variant="success">Опубліковано</Badge>
                    ) : (
                      <Badge variant="outline">Чернетка</Badge>
                    )}
                  </span>
                </div>

                <p className="line-clamp-4 flex-1 text-sm text-muted-foreground">{item.text}</p>

                <p className="text-xs text-muted-foreground">Порядок: {item.sortOrder}</p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(item)}
                    aria-label={`Редагувати відгук від «${item.name}»`}
                  >
                    Редагувати
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(item)}
                    aria-label={`Видалити відгук від «${item.name}»`}
                  >
                    Видалити
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setError(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редагувати відгук" : "Новий відгук"}</DialogTitle>
            <DialogDescription>
              Заповніть текст відгуку, поставте оцінку та виберіть, показувати його на сайті.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="testimonial-name">Ім’я</Label>
              <Input
                id="testimonial-name"
                type="text"
                value={form.name}
                required
                placeholder="Олена К."
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-text">Текст відгуку</Label>
              <Textarea
                id="testimonial-text"
                value={form.text}
                required
                placeholder="Що саме сподобалось клієнту"
                onChange={(event) =>
                  setForm((current) => ({ ...current, text: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Оцінка</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1" role="group" aria-label="Оцінка від 1 до 5">
                  {RATING_VALUES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`Оцінка ${value} з 5`}
                      aria-pressed={form.rating === value}
                      onClick={() => setForm((current) => ({ ...current, rating: value }))}
                      className="rounded-md p-1 transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <Star
                        aria-hidden="true"
                        className={cn(
                          "size-6",
                          value <= form.rating
                            ? "fill-accent text-accent"
                            : "text-muted-foreground/40",
                        )}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{form.rating} з 5</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-event">Тип події</Label>
              <Input
                id="testimonial-event"
                type="text"
                value={form.eventType}
                placeholder="Дитяче свято"
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventType: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-file">Фото автора</Label>
              <Input
                id="testimonial-file"
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                className="h-auto py-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
              />
              <p className="text-xs text-muted-foreground">
                SVG не приймається: такий файл може містити скрипт, а фото відкриваються з того
                самого домену, що й сайт — це була б загроза безпеці.
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

            <div className="space-y-2">
              <Label htmlFor="testimonial-photo-url">URL фото</Label>
              <Input
                id="testimonial-photo-url"
                type="text"
                value={form.photoUrl}
                placeholder="Залиште порожнім, якщо фото немає"
                onChange={(event) =>
                  setForm((current) => ({ ...current, photoUrl: event.target.value }))
                }
              />
            </div>

            {form.photoUrl ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <img
                  src={form.photoUrl}
                  alt="Прев’ю фото автора відгуку"
                  className="h-40 w-full object-cover"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="testimonial-order">Порядок</Label>
              <Input
                id="testimonial-order"
                type="number"
                min={0}
                max={9999}
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sortOrder: event.target.value }))
                }
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isPublished: event.target.checked }))
                }
                className="size-5 rounded border-2 border-input accent-primary"
              />
              <span>Опубліковано — відгук показується на сайті</span>
            </label>

            {error ? <FormAlert message={error} /> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Скасувати
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Зберігаємо…" : editingId ? "Зберегти зміни" : "Додати відгук"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
