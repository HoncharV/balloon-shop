"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Calculator, Loader2, Send, Sparkles } from "lucide-react";

import { trackEvent } from "@/components/analytics-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuizConfigData } from "@/data/quiz-config";
import { ANALYTICS_EVENTS } from "@/lib/constants";
import { telegramLeadMessage, telegramUrl } from "@/lib/links";
import { normalizeUaPhone } from "@/lib/phone";
import { getEnabledOptions } from "@/lib/quiz-config";
import { cn } from "@/lib/utils";
import type { LeadApiResponse, SettingsView } from "@/types/site";

import { SectionHeading } from "./section-heading";

const priceFormatter = new Intl.NumberFormat("uk-UA");

function formatPrice(value: number): string {
  return priceFormatter.format(Math.round(value));
}

type Phase = "form" | "contact" | "result";

/** Мінімум полів, потрібний для показу варіанта; конфігурація йому відповідає. */
type DisplayOption = {
  value: string;
  label: string;
  hint?: string;
  emoji?: string;
};

export function CalculatorBlock({
  config,
  settings,
}: {
  config: QuizConfigData;
  settings: SettingsView;
}) {
  const holidayOptions: DisplayOption[] = getEnabledOptions(config, "HOLIDAY");
  const guestsOptions: DisplayOption[] = getEnabledOptions(config, "GUESTS");
  const decorOptions: DisplayOption[] = getEnabledOptions(config, "DECOR");

  const [holidayType, setHolidayType] = useState("");
  const [guests, setGuests] = useState("");
  const [decorLevel, setDecorLevel] = useState("");
  const [delivery, setDelivery] = useState<"yes" | "no">("yes");

  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [quote, setQuote] = useState<LeadApiResponse["quote"]>(undefined);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const sectionRef = useRef<HTMLElement | null>(null);
  const startedAtRef = useRef<number | null>(null);

  // Один раз фіксуємо, що користувач побачив калькулятор
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            trackEvent(ANALYTICS_EVENTS.CALCULATOR_OPEN);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function markStarted() {
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
  }

  const formComplete = Boolean(holidayType && guests && decorLevel);
  const phoneInvalid = phone.trim().length > 0 && normalizeUaPhone(phone) === null;
  const canSubmit =
    phase === "contact" &&
    name.trim().length >= 2 &&
    normalizeUaPhone(phone) !== null &&
    !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "CALCULATOR",
          name: name.trim(),
          phone: phone.trim(),
          holidayType,
          guests,
          decorLevel,
          delivery: delivery === "yes",
          elapsedMs: Date.now() - (startedAtRef.current ?? Date.now()),
          honeypot,
        }),
      });

      const data = (await response.json()) as LeadApiResponse;

      if (data.ok && data.quote) {
        setQuote(data.quote);
        setPhase("result");
        trackEvent(ANALYTICS_EVENTS.CALCULATOR_SUBMIT);
        return;
      }

      setError(data.message ?? "Не вдалося розрахувати вартість. Спробуйте ще раз.");
      setFieldErrors(data.fields ?? {});
    } catch {
      setError("Немає зв'язку з сервером. Перевірте інтернет і спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="calculator"
      ref={sectionRef}
      className="scroll-mt-24 bg-muted/40 py-14 sm:py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Розрахунок"
          title="Калькулятор вартості"
          description="Оберіть параметри свята — і ми покажемо орієнтовну кількість кульок, вартість та найкращий набір."
        />

        <Card className="mt-8 sm:mt-10">
          <CardContent className="p-5 sm:p-8">
            {phase === "result" && quote ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="size-5 text-primary" aria-hidden />
                  </span>
                  <h3 className="text-xl font-bold sm:text-2xl">
                    Орієнтовний розрахунок готовий
                  </h3>
                </div>

                <dl className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border bg-white p-4">
                    <dt className="text-sm text-muted-foreground">Рекомендовано кульок</dt>
                    <dd className="font-display mt-1 text-2xl font-bold">
                      {quote.recommendedBalloons}
                    </dd>
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <dt className="text-sm text-muted-foreground">Орієнтовна вартість</dt>
                    <dd className="font-display mt-1 text-2xl font-bold text-primary">
                      {formatPrice(quote.estimatedPrice)} грн
                    </dd>
                    {quote.priceMax > quote.estimatedPrice ? (
                      <dd className="mt-0.5 text-xs text-muted-foreground">
                        до {formatPrice(quote.priceMax)} грн
                      </dd>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <dt className="text-sm text-muted-foreground">Рекомендований набір</dt>
                    <dd className="font-display mt-1">
                      <a
                        href="#packages"
                        className="text-lg font-bold text-primary underline-offset-4 hover:underline"
                      >
                        {quote.recommendedPackageName}
                      </a>
                    </dd>
                  </div>
                </dl>

                <p className="text-sm text-muted-foreground">
                  {quote.deliveryFree
                    ? "Доставка по Києву входить у розрахунок без доплат."
                    : "Доставку по Києву порахуємо окремо — уточнить менеджер."}{" "}
                  Остаточну ціну підтвердимо після уточнення деталей.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="xl" className="w-full sm:w-auto">
                    <a
                      href={telegramUrl(settings, telegramLeadMessage(name))}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent(ANALYTICS_EVENTS.TELEGRAM_CLICK)}
                    >
                      <Send className="size-5" aria-hidden />
                      Обговорити в Telegram
                    </a>
                  </Button>

                  <Button asChild size="xl" variant="outline" className="w-full sm:w-auto">
                    <a href="#packages">Подивитись набори</a>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="relative">
                <div
                  className={cn(
                    "grid gap-6 lg:grid-cols-2",
                    phase === "contact" ? "pointer-events-none opacity-60" : undefined,
                  )}
                  aria-hidden={phase === "contact"}
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="calc-holiday">Тип свята</Label>
                    <Select
                      value={holidayType || undefined}
                      onValueChange={(value) => {
                        markStarted();
                        setHolidayType(value);
                      }}
                    >
                      <SelectTrigger id="calc-holiday" disabled={phase === "contact"}>
                        <SelectValue placeholder="Оберіть свято" />
                      </SelectTrigger>
                      <SelectContent>
                        {holidayOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="calc-guests">Кількість гостей</Label>
                    <Select
                      value={guests || undefined}
                      onValueChange={(value) => {
                        markStarted();
                        setGuests(value);
                      }}
                    >
                      <SelectTrigger id="calc-guests" disabled={phase === "contact"}>
                        <SelectValue placeholder="Оберіть кількість" />
                      </SelectTrigger>
                      <SelectContent>
                        {guestsOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <fieldset className="lg:col-span-2">
                    <legend className="mb-3 text-sm font-medium">Рівень оформлення</legend>

                    <RadioGroup
                      value={decorLevel}
                      onValueChange={(value) => {
                        markStarted();
                        setDecorLevel(value);
                      }}
                      disabled={phase === "contact"}
                      className="gap-3"
                    >
                      {decorOptions.map((option) => (
                        <div
                          key={option.value}
                          className={cn(
                            "flex items-start gap-3 rounded-2xl border-2 bg-white p-4 transition-colors duration-200",
                            decorLevel === option.value
                              ? "border-primary shadow-soft"
                              : "border-input",
                          )}
                        >
                          <RadioGroupItem
                            id={`calc-decor-${option.value}`}
                            value={option.value}
                            className="mt-0.5"
                          />
                          <Label
                            htmlFor={`calc-decor-${option.value}`}
                            className="flex-1 cursor-pointer font-normal"
                          >
                            <span className="block font-semibold">{option.label}</span>
                            {option.hint ? (
                              <span className="mt-0.5 block text-sm text-muted-foreground">
                                {option.hint}
                              </span>
                            ) : null}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </fieldset>

                  <fieldset className="lg:col-span-2">
                    <legend className="mb-3 text-sm font-medium">Потрібна доставка?</legend>

                    <RadioGroup
                      value={delivery}
                      onValueChange={(value) => setDelivery(value as "yes" | "no")}
                      disabled={phase === "contact"}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <div
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-2xl border-2 bg-white p-4",
                          delivery === "yes" ? "border-primary shadow-soft" : "border-input",
                        )}
                      >
                        <RadioGroupItem id="calc-delivery-yes" value="yes" />
                        <Label
                          htmlFor="calc-delivery-yes"
                          className="cursor-pointer font-normal"
                        >
                          Так, потрібна
                        </Label>
                      </div>

                      <div
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-2xl border-2 bg-white p-4",
                          delivery === "no" ? "border-primary shadow-soft" : "border-input",
                        )}
                      >
                        <RadioGroupItem id="calc-delivery-no" value="no" />
                        <Label
                          htmlFor="calc-delivery-no"
                          className="cursor-pointer font-normal"
                        >
                          Ні, заберу сам
                        </Label>
                      </div>
                    </RadioGroup>
                  </fieldset>
                </div>

                {phase === "contact" ? (
                  <div className="mt-8 rounded-2xl border-2 border-primary/25 bg-primary/5 p-5">
                    <h3 className="text-lg font-semibold">
                      Куди надіслати розрахунок?
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Залиште ім&apos;я та телефон — і ми одразу покажемо результат, а також
                      надішлемо його в Telegram.
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="calc-name">Ім&apos;я</Label>
                        <Input
                          id="calc-name"
                          name="name"
                          autoComplete="name"
                          value={name}
                          aria-invalid={
                            (name.trim().length > 0 && name.trim().length < 2) ||
                            Boolean(fieldErrors.name)
                          }
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setName(event.target.value)
                          }
                          placeholder="Олена"
                        />
                        {fieldErrors.name ? (
                          <p className="text-sm text-destructive">{fieldErrors.name}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="calc-phone">Телефон</Label>
                        <Input
                          id="calc-phone"
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={phone}
                          aria-invalid={phoneInvalid || Boolean(fieldErrors.phone)}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setPhone(event.target.value)
                          }
                          placeholder="+380 67 887 33 33"
                        />
                        {phoneInvalid || fieldErrors.phone ? (
                          <p className="text-sm text-destructive">
                            {fieldErrors.phone ??
                              "Невірний формат номера. Приклад: +380 67 887 33 33"}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <p
                    role="alert"
                    className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                  >
                    {error}
                  </p>
                ) : null}

                {/* Пастка для ботів */}
                <div className="absolute top-0 left-[-9999px]">
                  <label htmlFor="calc-company">Компанія</label>
                  <input
                    id="calc-company"
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

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  {phase === "form" ? (
                    <Button
                      type="button"
                      size="xl"
                      disabled={!formComplete}
                      onClick={() => {
                        markStarted();
                        setPhase("contact");
                      }}
                      className="w-full sm:w-auto"
                    >
                      <Calculator className="size-5" aria-hidden />
                      Розрахувати вартість
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="submit"
                        size="xl"
                        disabled={!canSubmit}
                        className="w-full sm:w-auto"
                      >
                        {submitting ? (
                          <Loader2 className="size-5 animate-spin" aria-hidden />
                        ) : (
                          <Calculator className="size-5" aria-hidden />
                        )}
                        Показати розрахунок
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        disabled={submitting}
                        onClick={() => {
                          setError("");
                          setPhase("form");
                        }}
                        className="w-full sm:w-auto"
                      >
                        Змінити параметри
                      </Button>
                    </>
                  )}

                  {phase === "form" && !formComplete ? (
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                      Заповніть усі поля вище
                    </p>
                  ) : null}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
