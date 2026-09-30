"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { trackEvent } from "@/components/analytics-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  QUIZ_VISIBLE_STEP_KEYS,
  type QuizConfigData,
  type QuizStepKey,
} from "@/data/quiz-config";
import { ANALYTICS_EVENTS } from "@/lib/constants";
import { telegramLeadMessage, telegramUrl } from "@/lib/links";
import { normalizeUaPhone } from "@/lib/phone";
import { getEnabledOptions, getStep } from "@/lib/quiz-config";
import { cn } from "@/lib/utils";
import type { LeadApiResponse, SettingsView } from "@/types/site";

import { SectionHeading } from "./section-heading";

const AUTO_ADVANCE_MS = 250;

/**
 * Кроки й варіанти приходять із конфігурації (`QuizOptionConfig`), де `value`
 * — довільний рядок. Для показу достатньо цих полів, тому замість узагальнень
 * використовуємо локальний тип: конфігурація структурно йому відповідає.
 */
type DisplayOption = {
  value: string;
  label: string;
  hint?: string;
  emoji?: string;
};

/** Тримає індекс кроку в межах списку, який приїхав із конфігурації. */
function clampStep(index: number, total: number): number {
  return Math.min(Math.max(index, 0), total - 1);
}

function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function ChoiceGrid({
  options,
  selected,
  onSelect,
  className,
  labelledBy,
}: {
  options: DisplayOption[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
  labelledBy: string;
}) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className={cn("grid gap-3", className)}
    >
      {options.map((option) => {
        const isSelected = selected === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex min-h-[76px] w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
              isSelected ? "border-primary shadow-pop" : "border-input",
            )}
          >
            {option.emoji ? (
              <span className="text-2xl" aria-hidden>
                {option.emoji}
              </span>
            ) : null}

            <span className="flex-1">
              <span className="block font-semibold">{option.label}</span>
              {option.hint ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.hint}
                </span>
              ) : null}
            </span>

            <CheckCircle2
              className={cn(
                "size-5 shrink-0 transition-opacity duration-200",
                isSelected ? "text-primary opacity-100" : "opacity-0",
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

export function QuizFunnel({
  config,
  settings,
  discountPercent,
}: {
  config: QuizConfigData;
  settings: SettingsView;
  discountPercent: number;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [holidayType, setHolidayType] = useState("");
  const [audience, setAudience] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [today, setToday] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  // Вимкнені в адмінці кроки не показуємо і не враховуємо в нумерації.
  // CONTACTS вимкнути не можна, тому список ніколи не буває порожнім.
  const steps = QUIZ_VISIBLE_STEP_KEYS
    .map((key) => getStep(config, key))
    .filter((step) => step.isEnabled);
  const totalSteps = steps.length;
  const activeIndex = clampStep(stepIndex, totalSteps);
  const currentStep = steps[activeIndex];
  const stepNumber = activeIndex + 1;

  const sectionRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const skipFirstFocusRef = useRef(true);

  // `min` для поля дати рахуємо на клієнті, щоб не смикати рік на межі доби
  useEffect(() => {
    setToday(todayIso());
  }, []);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  // Перехід фокуса на заголовок кроку (але не при першому рендері)
  useEffect(() => {
    if (skipFirstFocusRef.current) {
      skipFirstFocusRef.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stepIndex, done]);

  // Один раз за сесію фіксуємо, що секцію квіза побачили
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            trackEvent(ANALYTICS_EVENTS.QUIZ_VIEW);
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
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
      trackEvent(ANALYTICS_EVENTS.QUIZ_START);
    }
  }

  function choose(value: string) {
    markStarted();

    const key = currentStep.key;
    if (key === "HOLIDAY") setHolidayType(value);
    else if (key === "AUDIENCE") setAudience(value);
    else if (key === "GUESTS") setGuests(value);
    else if (key === "BUDGET") setBudget(value);
    else return;

    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
    }
    advanceTimerRef.current = window.setTimeout(() => {
      setStepIndex((current) => clampStep(current + 1, totalSteps));
    }, AUTO_ADVANCE_MS);
  }

  function goBack() {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setError("");
    setStepIndex((current) => clampStep(current - 1, totalSteps));
  }

  function goNext() {
    setStepIndex((current) => clampStep(current + 1, totalSteps));
  }

  /** Відповідь, уже обрана на цьому кроці (щоб «Назад» не скидав вибір). */
  function selectedFor(key: QuizStepKey): string {
    if (key === "HOLIDAY") return holidayType;
    if (key === "AUDIENCE") return audience;
    if (key === "GUESTS") return guests;
    if (key === "BUDGET") return budget;
    return "";
  }

  const nameInvalid = name.trim().length > 0 && name.trim().length < 2;
  const phoneInvalid = phone.trim().length > 0 && normalizeUaPhone(phone) === null;
  const canSubmit =
    name.trim().length >= 2 && normalizeUaPhone(phone) !== null && !submitting;

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
          source: "QUIZ",
          name: name.trim(),
          phone: phone.trim(),
          holidayType,
          // Крок вимкнено в адмінці → вибору немає. Порожній рядок не проходить
          // enum-валідацію заявки, тож надсилаємо undefined.
          audience: audience || undefined,
          guests,
          budget: budget || undefined,
          eventDate: eventDate || undefined,
          elapsedMs: Date.now() - (startedAtRef.current ?? Date.now()),
          honeypot,
        }),
      });

      const data = (await response.json()) as LeadApiResponse;

      if (data.ok) {
        trackEvent(ANALYTICS_EVENTS.QUIZ_COMPLETE);
        setDone(true);
        return;
      }

      setError(data.message ?? "Не вдалося надіслати заявку. Спробуйте ще раз.");
      setFieldErrors(data.fields ?? {});
    } catch {
      setError("Немає зв'язку з сервером. Перевірте інтернет і спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="quiz"
      ref={sectionRef}
      className="scroll-mt-24 py-14 sm:py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Квіз"
          title={config.title}
          description={config.subtitle}
        />

        <Card className="mt-8 sm:mt-10">
          <CardContent className="p-5 sm:p-8">
            {done ? (
              <div className="flex flex-col items-center gap-4 py-2 text-center sm:gap-5">
                <span className="flex size-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="size-9 text-success" aria-hidden />
                </span>

                <h3
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-2xl font-bold outline-none sm:text-3xl"
                >
                  Дякуємо! Заявку прийнято
                </h3>

                <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Ми вже бачимо ваші відповіді. Менеджер зв&apos;яжеться з вами
                  найближчим часом, щоб уточнити деталі та час доставки.
                </p>

                <p className="rounded-2xl bg-accent/20 px-5 py-3 font-semibold">
                  Знижка {discountPercent}% на оформлення
                </p>

                <Button asChild size="xl" className="w-full sm:w-auto">
                  <a
                    href={telegramUrl(settings, telegramLeadMessage(name))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent(ANALYTICS_EVENTS.TELEGRAM_CLICK)}
                  >
                    <Send className="size-5" aria-hidden />
                    Перейти в Telegram
                  </a>
                </Button>

                <p className="text-xs text-muted-foreground">
                  Напишіть нам — відповідаємо протягом кількох хвилин.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="relative">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>
                      Крок {stepNumber} з {totalSteps}
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round((stepNumber / totalSteps) * 100)}%
                    </span>
                  </div>
                  <Progress value={(stepNumber / totalSteps) * 100} />
                </div>

                <h3
                  id="quiz-step-title"
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-6 text-xl font-bold outline-none sm:text-2xl"
                >
                  {currentStep.title}
                </h3>
                {currentStep.subtitle ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentStep.subtitle}
                  </p>
                ) : null}

                <div className="mt-5">
                  {currentStep.options.length > 0 ? (
                    <ChoiceGrid
                      labelledBy="quiz-step-title"
                      options={getEnabledOptions(config, currentStep.key)}
                      selected={selectedFor(currentStep.key)}
                      onSelect={choose}
                      className={
                        currentStep.key === "HOLIDAY"
                          ? "sm:grid-cols-2 lg:grid-cols-3"
                          : "sm:grid-cols-2 lg:grid-cols-4"
                      }
                    />
                  ) : null}

                  {currentStep.key === "DATE" ? (
                    <div className="max-w-sm">
                      <Label htmlFor="quiz-date">Дата заходу</Label>
                      <Input
                        id="quiz-date"
                        type="date"
                        min={today || undefined}
                        value={eventDate}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          markStarted();
                          setEventDate(event.target.value);
                        }}
                        className="mt-2"
                      />
                    </div>
                  ) : null}

                  {currentStep.key === "CONTACTS" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="quiz-name">Ім&apos;я</Label>
                        <Input
                          id="quiz-name"
                          name="name"
                          autoComplete="name"
                          value={name}
                          aria-invalid={nameInvalid || Boolean(fieldErrors.name)}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            markStarted();
                            setName(event.target.value);
                          }}
                          placeholder="Олена"
                        />
                        {nameInvalid || fieldErrors.name ? (
                          <p className="text-sm text-destructive">
                            {fieldErrors.name ?? "Вкажіть ім'я — мінімум 2 символи"}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="quiz-phone">Телефон</Label>
                        <Input
                          id="quiz-phone"
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={phone}
                          aria-invalid={phoneInvalid || Boolean(fieldErrors.phone)}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            markStarted();
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
                    </div>
                  ) : null}
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                  >
                    {error}
                  </p>
                ) : null}

                {/* Пастка для ботів: людина цього поля не бачить */}
                <div className="absolute top-0 left-[-9999px]">
                  <label htmlFor="quiz-company">Компанія</label>
                  <input
                    id="quiz-company"
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

                <div className="mt-8 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goBack}
                    disabled={activeIndex === 0 || submitting}
                    className="w-full sm:w-auto"
                  >
                    Назад
                  </Button>

                  {currentStep.key === "CONTACTS" ? (
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!canSubmit}
                      className="w-full sm:w-auto"
                    >
                      {submitting ? (
                        <Loader2 className="size-5 animate-spin" aria-hidden />
                      ) : (
                        <Send className="size-5" aria-hidden />
                      )}
                      Надіслати заявку
                    </Button>
                  ) : currentStep.key === "DATE" ? (
                    <Button
                      type="button"
                      size="lg"
                      onClick={goNext}
                      className="w-full sm:w-auto"
                    >
                      Далі
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                      Оберіть варіант, щоб перейти далі
                    </p>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
