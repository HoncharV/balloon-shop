"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AtSign,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Send,
} from "lucide-react";

import { trackEvent } from "@/components/analytics-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ANALYTICS_EVENTS } from "@/lib/constants";
// Список свят беремо з конфігурації квіза, а не з констант: якщо власник
// приховав свято в квізі, воно не має з'являтися й тут — інакше дві форми на
// одній сторінці показуватимуть різні списки.
import { getEnabledOptions } from "@/lib/quiz-config";
import type { QuizConfigData } from "@/data/quiz-config";
import {
  instagramUrl,
  mapEmbedUrl,
  mapsLink,
  telHref,
  telegramLeadMessage,
  telegramUrl,
} from "@/lib/links";
import { formatUaPhone, normalizeUaPhone } from "@/lib/phone";
import type { LeadApiResponse, SettingsView } from "@/types/site";

import { SectionHeading } from "./section-heading";

const NO_HOLIDAY = "none";

export function Contacts({ settings, config }: { settings: SettingsView; config: QuizConfigData }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [holidayType, setHolidayType] = useState(NO_HOLIDAY);
  const [comment, setComment] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const startedAtRef = useRef<number | null>(null);

  const phoneInvalid = phone.trim().length > 0 && normalizeUaPhone(phone) === null;
  const canSubmit =
    name.trim().length >= 2 && normalizeUaPhone(phone) !== null && !sending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSending(true);
    setError("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "CONTACT",
          name: name.trim(),
          phone: phone.trim(),
          holidayType: holidayType === NO_HOLIDAY ? undefined : holidayType,
          comment: comment.trim() || undefined,
          elapsedMs: Date.now() - (startedAtRef.current ?? Date.now()),
          honeypot,
        }),
      });

      const data = (await response.json()) as LeadApiResponse;

      if (data.ok) {
        setSent(true);
        return;
      }

      setError(data.message ?? "Не вдалося надіслати заявку. Спробуйте ще раз.");
      setFieldErrors(data.fields ?? {});
    } catch {
      setError("Немає зв'язку з сервером. Перевірте інтернет і спробуйте ще раз.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contacts" className="scroll-mt-24 bg-muted/40 py-14 sm:py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Зв'язок"
          title="Контакти"
          description="Зателефонуйте, напишіть у Telegram або залиште заявку — відповідаємо протягом кількох хвилин."
        />

        <div className="mt-8 grid gap-6 sm:mt-12 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-1 p-2 sm:p-3">
                <a
                  href={telHref(settings)}
                  onClick={() => trackEvent(ANALYTICS_EVENTS.PHONE_CLICK)}
                  className="flex min-h-14 items-center gap-3 rounded-xl px-3 transition-colors duration-200 hover:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="size-5 text-primary" aria-hidden />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Телефон</span>
                    <span className="font-semibold">
                      {formatUaPhone(settings.phone)}
                    </span>
                  </span>
                </a>

                <a
                  href={telegramUrl(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent(ANALYTICS_EVENTS.TELEGRAM_CLICK)}
                  className="flex min-h-14 items-center gap-3 rounded-xl px-3 transition-colors duration-200 hover:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                    <Send className="size-5 text-foreground" aria-hidden />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Telegram</span>
                    <span className="font-semibold">@{settings.telegram}</span>
                  </span>
                </a>

                <a
                  href={instagramUrl(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-14 items-center gap-3 rounded-xl px-3 transition-colors duration-200 hover:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/20">
                    <AtSign className="size-5 text-foreground" aria-hidden />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Instagram</span>
                    <span className="font-semibold">@{settings.instagram}</span>
                  </span>
                </a>

                <a
                  href={mapsLink(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-14 items-center gap-3 rounded-xl px-3 transition-colors duration-200 hover:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <MapPin className="size-5 text-foreground" aria-hidden />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Адреса</span>
                    <span className="font-semibold">{settings.address}</span>
                  </span>
                </a>

                <div className="flex min-h-14 items-center gap-3 rounded-xl px-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Clock className="size-5 text-foreground" aria-hidden />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Графік роботи</span>
                    <span className="font-semibold">{settings.workingHours}</span>
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="overflow-hidden rounded-2xl border bg-white shadow-soft">
              <iframe
                src={mapEmbedUrl(settings)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Мапа"
                className="h-64 w-full border-0 sm:h-72"
              />
            </div>
          </div>

          <Card className="h-fit">
            <CardContent className="p-5 sm:p-8">
              {sent ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <h3 className="text-xl font-bold sm:text-2xl">
                    Дякуємо! Заявку прийнято
                  </h3>
                  <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Ми зв&apos;яжемося з вами найближчим часом. А якщо хочете швидше —
                    напишіть у Telegram.
                  </p>
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <a
                      href={telegramUrl(settings, telegramLeadMessage(name))}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent(ANALYTICS_EVENTS.TELEGRAM_CLICK)}
                    >
                      <Send className="size-5" aria-hidden />
                      Написати в Telegram
                    </a>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="relative">
                  <h3 className="text-xl font-bold sm:text-2xl">Швидке замовлення</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Залиште контакти — підберемо оформлення та порахуємо вартість.
                  </p>

                  <div className="mt-5 grid gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="contact-name">Ім&apos;я</Label>
                      <Input
                        id="contact-name"
                        name="name"
                        autoComplete="name"
                        value={name}
                        aria-invalid={
                          (name.trim().length > 0 && name.trim().length < 2) ||
                          Boolean(fieldErrors.name)
                        }
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          if (startedAtRef.current === null)
                            startedAtRef.current = Date.now();
                          setName(event.target.value);
                        }}
                        placeholder="Олена"
                      />
                      {fieldErrors.name ? (
                        <p className="text-sm text-destructive">{fieldErrors.name}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="contact-phone">Телефон</Label>
                      <Input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        aria-invalid={phoneInvalid || Boolean(fieldErrors.phone)}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          if (startedAtRef.current === null)
                            startedAtRef.current = Date.now();
                          setPhone(event.target.value);
                        }}
                        placeholder="+380 67 887 33 33"
                      />
                      {phoneInvalid || fieldErrors.phone ? (
                        <p className="text-sm text-destructive">
                          {fieldErrors.phone ??
                            "Невірний формат номера. Приклад: +380 67 887 33 33"}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="contact-holiday">Тип свята (необов&apos;язково)</Label>
                      <Select value={holidayType} onValueChange={setHolidayType}>
                        <SelectTrigger id="contact-holiday">
                          <SelectValue placeholder="Оберіть свято" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_HOLIDAY}>Ще не визначився</SelectItem>
                          {getEnabledOptions(config, "HOLIDAY").map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="contact-comment">Коментар</Label>
                      <Textarea
                        id="contact-comment"
                        name="comment"
                        value={comment}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                          setComment(event.target.value)
                        }
                        rows={4}
                        placeholder="Дата свята, адреса, побажання щодо кольорів"
                      />
                    </div>
                  </div>

                  {error ? (
                    <p
                      role="alert"
                      className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                    >
                      {error}
                    </p>
                  ) : null}

                  {/* Пастка для ботів */}
                  <div className="absolute top-0 left-[-9999px]">
                    <label htmlFor="contact-company">Компанія</label>
                    <input
                      id="contact-company"
                      name="company"
                      type="text"
                      value={honeypot}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setHoneypot(event.target.value)
                      }
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={!canSubmit}
                    className="mt-5 w-full"
                  >
                    {sending ? (
                      <Loader2 className="size-5 animate-spin" aria-hidden />
                    ) : (
                      <Send className="size-5" aria-hidden />
                    )}
                    Відправити заявку
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
