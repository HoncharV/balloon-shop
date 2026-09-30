"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save } from "lucide-react";

import { sendJson } from "@/app/admin/_lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatUaPhone, normalizeUaPhone } from "@/lib/phone";

import type { SettingsView } from "@/types/site";

type FormState = {
  phone: string;
  telegram: string;
  instagram: string;
  address: string;
  workingHours: string;
  mapEmbedUrl: string;
  discountPercent: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

/**
 * Контакти й параметри сайту: телефон, Telegram, Instagram, адреса,
 * графік роботи, карта та знижка після квіза.
 *
 * Телефон перевіряється `normalizeUaPhone` одразу у формі: адміністратор
 * бачить, як саме номер потрапить у базу й у Telegram-посилання, ще до
 * збереження.
 */
export function SettingsForm({ settings }: { settings: SettingsView }) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    phone: settings.phone,
    telegram: settings.telegram,
    instagram: settings.instagram,
    address: settings.address,
    workingHours: settings.workingHours,
    mapEmbedUrl: settings.mapEmbedUrl ?? "",
    discountPercent: String(settings.discountPercent),
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const normalizedPhone = normalizeUaPhone(form.phone);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    setFieldErrors({});

    const result = await sendJson("/api/admin/settings", "PATCH", {
      phone: form.phone.trim(),
      telegram: form.telegram.trim(),
      instagram: form.instagram.trim(),
      address: form.address.trim(),
      workingHours: form.workingHours.trim(),
      // Порожнє поле означає «згенерувати карту автоматично за адресою».
      mapEmbedUrl: form.mapEmbedUrl.trim(),
      discountPercent: Number.parseInt(form.discountPercent, 10) || 0,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fields ?? {});
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Контакти</CardTitle>
          <CardDescription>
            Ці дані показуються на сайті в шапці, у блоці контактів і у футері.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="settings-phone">Телефон</Label>
            <Input
              id="settings-phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              required
              placeholder="+380 67 887 33 33"
              onChange={(event) => update("phone", event.target.value)}
            />
            {normalizedPhone ? (
              <p className="text-xs text-muted-foreground">
                Буде збережено як{" "}
                <span className="font-medium text-foreground">{formatUaPhone(normalizedPhone)}</span>{" "}
                · посилання для кліку: {normalizedPhone}
              </p>
            ) : (
              <p className="text-xs text-destructive">
                Не схоже на український номер. Вкажіть у форматі +380 XX XXX XX XX.
              </p>
            )}
            <FieldError message={fieldErrors.phone} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-telegram">Telegram</Label>
            <Input
              id="settings-telegram"
              type="text"
              value={form.telegram}
              placeholder="party_mode_kiev"
              onChange={(event) => update("telegram", event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Тільки нікнейм, без «@» і без посилання. Профіль на сайті відкривається як t.me/
              {form.telegram.trim() || "нікнейм"}.
            </p>
            <FieldError message={fieldErrors.telegram} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-instagram">Instagram</Label>
            <Input
              id="settings-instagram"
              type="text"
              value={form.instagram}
              placeholder="party_mode_kiev"
              onChange={(event) => update("instagram", event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Тільки нікнейм, без «@» і без посилання.
            </p>
            <FieldError message={fieldErrors.instagram} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="settings-address">Адреса</Label>
            <Input
              id="settings-address"
              type="text"
              value={form.address}
              required
              placeholder="Лісовий проспект, 23Б, Київ, 02000"
              onChange={(event) => update("address", event.target.value)}
            />
            <FieldError message={fieldErrors.address} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="settings-hours">Графік роботи</Label>
            <Input
              id="settings-hours"
              type="text"
              value={form.workingHours}
              required
              placeholder="Щодня 9:00 – 21:00"
              onChange={(event) => update("workingHours", event.target.value)}
            />
            <FieldError message={fieldErrors.workingHours} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="settings-map">Посилання для вбудованої карти</Label>
            <Textarea
              id="settings-map"
              value={form.mapEmbedUrl}
              placeholder="https://www.google.com/maps/embed?pb=…"
              onChange={(event) => update("mapEmbedUrl", event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Необов’язково. Якщо залишити поле порожнім, карта на сайті згенерується автоматично за
              адресою.
            </p>
            <FieldError message={fieldErrors.mapEmbedUrl} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Квіз</CardTitle>
          <CardDescription>Обіцяна знижка після проходження квіза.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="settings-discount">Знижка після квіза, %</Label>
          <Input
            id="settings-discount"
            type="number"
            min={0}
            max={90}
            value={form.discountPercent}
            className="max-w-40"
            onChange={(event) => update("discountPercent", event.target.value)}
          />
          <p className="text-xs text-muted-foreground">Допустимо від 0 до 90 відсотків.</p>
          <FieldError message={fieldErrors.discountPercent} />
        </CardContent>
      </Card>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {saved ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Збережено. Зміни вже показуються на сайті.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          <Save className="size-5" aria-hidden="true" />
          {pending ? "Зберігаємо…" : "Зберегти налаштування"}
        </Button>
      </div>
    </form>
  );
}
