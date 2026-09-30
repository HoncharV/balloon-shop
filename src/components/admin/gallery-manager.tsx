"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Images, Plus, Upload } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GALLERY_CATEGORY_LABELS, GALLERY_CATEGORY_ORDER } from "@/lib/constants";

import type { GalleryView } from "@/types/site";

/**
 * Записи галереї в адмінці: до базового `GalleryView` додано ознаку
 * публікації, якої немає в публічному типі (на сайт неопубліковані фото
 * взагалі не потрапляють, тому й у типі для лендінга цього поля немає).
 */
export type GalleryAdminItem = GalleryView & {
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Формат, який приймає сервер. SVG тут свідомо відсутній. */
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/avif,image/gif";

type FormState = {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  sortOrder: string;
  isPublished: boolean;
};

function emptyForm(): FormState {
  return {
    title: "",
    description: "",
    category: GALLERY_CATEGORY_ORDER[0],
    imageUrl: "",
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

/**
 * Керування галереєю: додавання, редагування й видалення фото.
 *
 * Один і той самий діалог слугує і для створення, і для редагування —
 * менше станів і жодної розбіжності між двома формами.
 */
export function GalleryManager({ items }: { items: GalleryAdminItem[] }) {
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

  function openEdit(item: GalleryAdminItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      category: item.category,
      imageUrl: item.imageUrl,
      sortOrder: String(item.sortOrder),
      isPublished: item.isPublished,
    });
    setError(null);
    setUploadPercent(null);
    setOpen(true);
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

    setForm((current) => ({ ...current, imageUrl: result.url }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Вкажіть, будь ласка, назву фото");
      return;
    }
    if (!form.imageUrl.trim()) {
      setError("Завантажте файл або вкажіть URL фото");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      imageUrl: form.imageUrl.trim(),
      sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
      isPublished: form.isPublished,
    };

    setPending(true);
    const result = editingId
      ? await sendJson(`/api/admin/gallery/${editingId}`, "PATCH", payload)
      : await sendJson("/api/admin/gallery", "POST", payload);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function handleDelete(item: GalleryAdminItem) {
    const confirmed = window.confirm(
      `Видалити фото «${item.title}»? Скасувати цю дію неможливо.`,
    );
    if (!confirmed) return;

    setListError(null);
    const result = await sendJson(`/api/admin/gallery/${item.id}`, "DELETE");
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
            ? "У галереї ще немає фото."
            : `Усього фото: ${items.length}. Неопубліковані на сайті не показуються.`}
        </p>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-5" aria-hidden="true" />
          Додати фото
        </Button>
      </div>

      {listError && !open ? <FormAlert message={listError} /> : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
          <span
            className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Images className="size-6" />
          </span>
          <p className="font-display text-lg font-semibold text-foreground">Галерея порожня</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Додайте перше фото роботи — воно з’явиться в блоці «Наші роботи» на сайті.
          </p>
          <Button type="button" variant="outline" onClick={openCreate}>
            <Plus className="size-5" aria-hidden="true" />
            Додати фото
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="size-full object-cover"
                />
                <span className="absolute top-3 left-3">
                  {item.isPublished ? (
                    <Badge variant="success">Опубліковано</Badge>
                  ) : (
                    <Badge variant="outline">Чернетка</Badge>
                  )}
                </span>
              </div>

              <CardContent className="space-y-3 p-5">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.description || "Без опису"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    {GALLERY_CATEGORY_LABELS[item.category] ?? item.category}
                  </Badge>
                  <span>Порядок: {item.sortOrder}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(item)}
                    aria-label={`Редагувати фото «${item.title}»`}
                  >
                    Редагувати
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(item)}
                    aria-label={`Видалити фото «${item.title}»`}
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
            <DialogTitle>{editingId ? "Редагувати фото" : "Нове фото"}</DialogTitle>
            <DialogDescription>
              Файл завантажується на сервер одразу після вибору. Дозволені PNG, JPEG, WebP, AVIF і
              GIF до 5 МБ.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="gallery-file">Файл фото</Label>
              <Input
                id="gallery-file"
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
              <Label htmlFor="gallery-image-url">URL фото</Label>
              <Input
                id="gallery-image-url"
                type="text"
                value={form.imageUrl}
                placeholder="/uploads/… або https://…"
                onChange={(event) =>
                  setForm((current) => ({ ...current, imageUrl: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Альтернатива завантаженню: вставте адресу вже розміщеного фото.
              </p>
            </div>

            {form.imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <img
                  src={form.imageUrl}
                  alt="Прев’ю вибраного фото"
                  className="h-40 w-full object-cover"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="gallery-title">Назва</Label>
              <Input
                id="gallery-title"
                type="text"
                value={form.title}
                required
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gallery-description">Опис</Label>
              <Textarea
                id="gallery-description"
                value={form.description}
                placeholder="Коротко: що саме на фото"
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gallery-category">Категорія</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, category: value }))
                  }
                >
                  <SelectTrigger id="gallery-category">
                    <SelectValue placeholder="Виберіть категорію" />
                  </SelectTrigger>
                  <SelectContent>
                    {GALLERY_CATEGORY_ORDER.map((key) => (
                      <SelectItem key={key} value={key}>
                        {GALLERY_CATEGORY_LABELS[key] ?? key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gallery-order">Порядок</Label>
                <Input
                  id="gallery-order"
                  type="number"
                  min={0}
                  max={9999}
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: event.target.value }))
                  }
                />
              </div>
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
              <span>Опубліковано — фото показується на сайті</span>
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
                {pending ? "Зберігаємо…" : editingId ? "Зберегти зміни" : "Додати фото"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
