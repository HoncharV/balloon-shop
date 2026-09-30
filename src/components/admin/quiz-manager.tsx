"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CheckCircle2, Info, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

import { sendJson } from "@/app/admin/_lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ALWAYS_ENABLED_STEP_KEYS,
  ALLOWED_OPTION_VALUES,
  DEFAULT_QUIZ_CONFIG,
  QUIZ_STEP_ORDER,
  QUIZ_VISIBLE_STEP_KEYS,
  type OptionWeights,
  type QuizConfigData,
  type QuizOptionConfig,
  type QuizStepConfig,
  type QuizStepKey,
} from "@/data/quiz-config";
import { getStep } from "@/lib/quiz-config";

// ------------------------------------------------------------------ дрібниці

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

/** Порожньому рядку відповідає `null` — тоді значення у формі не чіпаємо. */
function parseNumber(raw: string, integer: boolean): number | null {
  if (raw.trim() === "") return null;
  const parsed = integer ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Нові ваги зі зміненим одним полем.
 *
 * `keyof OptionWeights` не можна підставити обчисленим ключем у літерал:
 * TypeScript перетворив би об'єкт на тип з індексною сигнатурою, і він
 * перестав би відповідати `.strict()`-схемі вагів. Тому — явний перелік.
 */
function withWeight(weights: OptionWeights | undefined, field: keyof OptionWeights, value: number): OptionWeights {
  const next: OptionWeights = weights ? { ...weights } : {};

  switch (field) {
    case "volume":
      next.volume = value;
      break;
    case "surcharge":
      next.surcharge = value;
      break;
    case "midpoint":
      next.midpoint = value;
      break;
    case "budgetFloor":
      next.budgetFloor = value;
      break;
    case "pricePerBalloon":
      next.pricePerBalloon = value;
      break;
    case "balloonsPerGuest":
      next.balloonsPerGuest = value;
      break;
  }

  return next;
}

function weightKey(stepKey: QuizStepKey, code: string, field: keyof OptionWeights): string {
  return `${stepKey}:${code}:${field}`;
}

/** Варіант із типової конфігурації — джерело підписів і ваг за замовчуванням. */
function defaultOption(stepKey: QuizStepKey, code: string): QuizOptionConfig | undefined {
  return DEFAULT_QUIZ_CONFIG.steps
    .find((step) => step.key === stepKey)
    ?.options.find((option) => option.value === code);
}

/** Кроки DATE і CONTACTS варіантів не мають — і додати їх неможливо. */
function stepHasOptions(stepKey: QuizStepKey): boolean {
  return ALLOWED_OPTION_VALUES[stepKey].length > 0;
}

function alwaysEnabledHint(stepKey: QuizStepKey): string {
  if (stepKey === "CONTACTS") {
    return "Вимкнути не можна: без цього кроку не вдасться прийняти заявку — саме тут клієнт лишає ім’я й телефон.";
  }
  return "Вимкнути не можна: без цього кроку не вдасться прийняти заявку — це поле вимагає калькулятор вартості.";
}

/** Помилки, для яких у формі немає окремого місця, показуємо одним рядком. */
function unhandledMessages(
  errors: Record<string, string>,
  prefix: string,
  handled: string[],
): string[] {
  return Object.entries(errors)
    .filter(([key]) => key.startsWith(prefix) && !handled.includes(key.slice(prefix.length)))
    .map(([, message]) => message);
}

// ---------------------------------------------------- числові поля з підказками

type NumberFieldProps = {
  id: string;
  label: string;
  hint: string;
  /** Те, що видно в полі: може бути незавершеним під час вводу («0.»). */
  text: string;
  integer: boolean;
  step: number;
  min: number;
  max: number;
  error?: string;
  onTextChange: (text: string, parsed: number | null) => void;
};

function NumberField({
  id,
  label,
  hint,
  text,
  integer,
  step,
  min,
  max,
  error,
  onTextChange,
}: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        step={step}
        min={min}
        max={max}
        value={text}
        onChange={(event) => onTextChange(event.target.value, parseNumber(event.target.value, integer))}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
      <FieldError message={error} />
    </div>
  );
}

// ------------------------------------------------- ваги калькулятора по кроках

type WeightFieldMeta = {
  key: keyof OptionWeights;
  label: string;
  hint: string;
  integer: boolean;
  step: number;
  min: number;
  max: number;
};

const WEIGHT_FIELDS: Record<QuizStepKey, WeightFieldMeta[]> = {
  HOLIDAY: [
    {
      key: "volume",
      label: "Множник обсягу",
      hint: "Множник обсягу: весілля потребує більше кульок, тому 1.35. Звичайне свято — 1, виписка з пологового — 0.85.",
      integer: false,
      step: 0.05,
      min: 0.05,
      max: 10,
    },
    {
      key: "surcharge",
      label: "Надбавка, грн",
      hint: "Фіксована доплата саме за це свято. Якщо доплати немає — 0.",
      integer: true,
      step: 50,
      min: 0,
      max: 100000,
    },
  ],
  GUESTS: [
    {
      key: "midpoint",
      label: "Гостей у розрахунку",
      hint: "Скільки гостей закладати в розрахунок для цього діапазону. Для «до 10» зазвичай беруть 8, для «50+» — 60.",
      integer: true,
      step: 1,
      min: 1,
      max: 500,
    },
  ],
  BUDGET: [
    {
      key: "budgetFloor",
      label: "Нижня межа, грн",
      hint: "Від якої суми починається діапазон. Потрібно, щоб калькулятор попереджав про перевищення бюджету.",
      integer: true,
      step: 100,
      min: 0,
      max: 1000000,
    },
  ],
  DECOR: [
    {
      key: "pricePerBalloon",
      label: "Ціна кульки, грн",
      hint: "Скільки коштує одна надута кулька цього рівня оформлення.",
      integer: true,
      step: 5,
      min: 1,
      max: 100000,
    },
    {
      key: "balloonsPerGuest",
      label: "Кульок на гостя",
      hint: "Скільки кульок закладаємо на одного гостя. Економ — близько 0.8, преміум — 2.4.",
      integer: false,
      step: 0.1,
      min: 0.1,
      max: 20,
    },
    {
      key: "surcharge",
      label: "Надбавка, грн",
      hint: "Фіксована доплата за монтаж і декор цього рівня.",
      integer: true,
      step: 50,
      min: 0,
      max: 100000,
    },
  ],
  // Ці кроки калькулятор не рахує — ваг у них немає.
  AUDIENCE: [],
  DATE: [],
  CONTACTS: [],
};

const GENERAL_FIELD_KEYS = ["title", "subtitle", "deliveryPrice", "freeDeliveryFrom"];
const STEP_FIELD_KEYS = ["title", "subtitle", "isEnabled", "options"];

// ------------------------------------------------------------------- редактор

/**
 * Редактор квіза: тексти кроків, варіанти відповідей і ваги калькулятора.
 *
 * Уся конфігурація живе в одному стані й надсилається цілком
 * (`PATCH /api/admin/quiz`). Це навмисно: варіанти та їхній порядок
 * редагуються як одне ціле, а часткове оновлення легко дало б неузгоджений
 * стан — наприклад, переставлений варіант без збереженої ваги.
 *
 * Код варіанта (`value`) тут ніде не редагується: він має лишатися в межах
 * enum'а в базі, інакше заявка не запишеться (див. `src/data/quiz-config.ts`).
 */
export function QuizManager({ config }: { config: QuizConfigData }) {
  const router = useRouter();

  const [draft, setDraft] = useState<QuizConfigData>(config);
  const [baseline, setBaseline] = useState<QuizConfigData>(config);
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});
  const [addSelection, setAddSelection] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  /** Єдина точка зміни чернетки: заодно знімає позначку «збережено». */
  function commit(updater: (current: QuizConfigData) => QuizConfigData) {
    setSaved(false);
    setDraft(updater);
  }

  function updateGeneral(
    patch: Partial<Pick<QuizConfigData, "title" | "subtitle" | "deliveryPrice" | "freeDeliveryFrom">>,
  ) {
    commit((current) => ({ ...current, ...patch }));
  }

  function updateStep(stepKey: QuizStepKey, patch: Partial<Omit<QuizStepConfig, "key" | "options">>) {
    commit((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.key === stepKey ? { ...step, ...patch } : step)),
    }));
  }

  function updateOption(
    stepKey: QuizStepKey,
    code: string,
    patch: Partial<Omit<QuizOptionConfig, "value" | "weights">>,
  ) {
    commit((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.key !== stepKey
          ? step
          : {
              ...step,
              options: step.options.map((option) =>
                option.value === code ? { ...option, ...patch } : option,
              ),
            },
      ),
    }));
  }

  function applyWeight(stepKey: QuizStepKey, code: string, field: keyof OptionWeights, value: number) {
    commit((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.key !== stepKey
          ? step
          : {
              ...step,
              options: step.options.map((option) =>
                option.value === code
                  ? { ...option, weights: withWeight(option.weights, field, value) }
                  : option,
              ),
            },
      ),
    }));
  }

  function moveOption(stepKey: QuizStepKey, index: number, delta: -1 | 1) {
    commit((current) => ({
      ...current,
      steps: current.steps.map((step) => {
        if (step.key !== stepKey) return step;

        const target = index + delta;
        if (target < 0 || target >= step.options.length) return step;

        const options = [...step.options];
        const [moved] = options.splice(index, 1);
        options.splice(target, 0, moved);
        return { ...step, options };
      }),
    }));
  }

  function removeOption(stepKey: QuizStepKey, code: string, label: string) {
    const confirmed = window.confirm(
      `Видалити варіант «${label}»? Старі заявки з цим варіантом показуватимуть його попередню назву з довідника.`,
    );
    if (!confirmed) return;

    setNumberDrafts({});
    commit((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.key !== stepKey
          ? step
          : { ...step, options: step.options.filter((option) => option.value !== code) },
      ),
    }));
  }

  function addOption(stepKey: QuizStepKey) {
    const step = getStep(draft, stepKey);
    const used = new Set(step.options.map((option) => option.value));
    const available = ALLOWED_OPTION_VALUES[stepKey].filter((code) => !used.has(code));
    if (available.length === 0) return;

    const selected = addSelection[stepKey] ?? "";
    const code = available.includes(selected) ? selected : available[0];

    const template = defaultOption(stepKey, code);
    const created: QuizOptionConfig = template
      ? { ...template, weights: template.weights ? { ...template.weights } : undefined }
      : { value: code, label: code, isEnabled: true };

    setNumberDrafts({});
    commit((current) => ({
      ...current,
      steps: current.steps.map((item) =>
        item.key === stepKey ? { ...item, options: [...item.options, created] } : item,
      ),
    }));
  }

  function resetToDefaults() {
    const confirmed = window.confirm(
      "Скинути всі зміни до типових значень? У формі з’являться типові тексти, варіанти й ваги, але в базу вони потраплять лише після натискання «Зберегти».",
    );
    if (!confirmed) return;

    setNumberDrafts({});
    setFieldErrors({});
    setError(null);
    commit(() => DEFAULT_QUIZ_CONFIG);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPending(true);
    setError(null);
    setFieldErrors({});
    setSaved(false);

    const result = await sendJson("/api/admin/quiz", "PATCH", draft);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fields ?? {});
      return;
    }

    setBaseline(draft);
    setNumberDrafts({});
    setSaved(true);
    router.refresh();
  }

  function errorAt(stepIndex: number, path: string): string | undefined {
    if (stepIndex < 0) return undefined;
    return fieldErrors[`steps.${stepIndex}.${path}`];
  }

  const generalOtherErrors = Object.entries(fieldErrors)
    .filter(([key]) => !key.startsWith("steps.") && !GENERAL_FIELD_KEYS.includes(key))
    .map(([, message]) => message);

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-foreground">Що можна змінювати, а що ні</p>
          <p className="text-muted-foreground">
            Підпис, підказку, емодзі, порядок і видимість варіанта можна змінювати вільно — у заявці
            зберігається внутрішній код, а не текст. Додати варіант можна лише зі списку дозволених
            кодів. Додати{" "}
            <strong className="font-semibold text-foreground">новий</strong> код (якого немає в
            структурі бази даних) не можна — це потребує зміни схеми БД, інакше заявка не
            збережеться.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Загальні</CardTitle>
          <CardDescription>
            Заголовок секції квіза на сайті та параметри доставки в калькуляторі вартості.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="quiz-title">Заголовок секції</Label>
            <Input
              id="quiz-title"
              type="text"
              value={draft.title}
              required
              onChange={(event) => updateGeneral({ title: event.target.value })}
            />
            <FieldError message={fieldErrors.title} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quiz-subtitle">Підзаголовок</Label>
            <Textarea
              id="quiz-subtitle"
              value={draft.subtitle}
              onChange={(event) => updateGeneral({ subtitle: event.target.value })}
            />
            <FieldError message={fieldErrors.subtitle} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              id="quiz-delivery-price"
              label="Вартість доставки, грн"
              hint="Скільки коштує доставка оформлення клієнтові."
              text={numberDrafts["quiz:deliveryPrice"] ?? String(draft.deliveryPrice)}
              integer
              step={10}
              min={0}
              max={100000}
              error={fieldErrors.deliveryPrice}
              onTextChange={(text, parsed) => {
                setNumberDrafts((current) => ({ ...current, "quiz:deliveryPrice": text }));
                if (parsed !== null) updateGeneral({ deliveryPrice: parsed });
              }}
            />

            <NumberField
              id="quiz-free-delivery-from"
              label="Безкоштовна доставка від, грн"
              hint="Від якої суми замовлення доставка не додається до ціни."
              text={numberDrafts["quiz:freeDeliveryFrom"] ?? String(draft.freeDeliveryFrom)}
              integer
              step={100}
              min={0}
              max={1000000}
              error={fieldErrors.freeDeliveryFrom}
              onTextChange={(text, parsed) => {
                setNumberDrafts((current) => ({ ...current, "quiz:freeDeliveryFrom": text }));
                if (parsed !== null) updateGeneral({ freeDeliveryFrom: parsed });
              }}
            />
          </div>

          {generalOtherErrors.length > 0 ? (
            <FormAlert message={generalOtherErrors.join(" · ")} />
          ) : null}
        </CardContent>
      </Card>

      {QUIZ_STEP_ORDER.map((stepKey) => {
        const step = getStep(draft, stepKey);
        const stepIndex = draft.steps.findIndex((item) => item.key === stepKey);
        const stepPrefix = `steps.${stepIndex}.`;
        const alwaysEnabled = ALWAYS_ENABLED_STEP_KEYS.includes(stepKey);
        const weightFields = WEIGHT_FIELDS[stepKey];
        const optionFieldKeys = [
          "label",
          "hint",
          "emoji",
          ...weightFields.map((field) => `weights.${field.key}`),
        ];

        const available = ALLOWED_OPTION_VALUES[stepKey].filter(
          (code) => !step.options.some((option) => option.value === code),
        );
        const selectedCode = available.includes(addSelection[stepKey] ?? "")
          ? (addSelection[stepKey] ?? "")
          : available[0];

        const stepOtherErrors =
          stepIndex < 0
            ? []
            : Object.entries(fieldErrors)
                .filter(([key]) => {
                  if (!key.startsWith(stepPrefix)) return false;
                  const rest = key.slice(stepPrefix.length);
                  return !rest.startsWith("options.") && !STEP_FIELD_KEYS.includes(rest);
                })
                .map(([, message]) => message);

        return (
          <Card key={stepKey}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{step.title}</CardTitle>
                <Badge variant="secondary" className="font-mono">
                  {stepKey}
                </Badge>
                {QUIZ_VISIBLE_STEP_KEYS.includes(stepKey) ? null : (
                  <Badge variant="outline">лише калькулятор</Badge>
                )}
              </div>
              <CardDescription>
                {stepHasOptions(stepKey)
                  ? "Тексти кроку, варіанти відповідей та їхній вплив на розрахунок вартості."
                  : "Крок без варіантів — редагуються лише заголовок і підказка."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`quiz-${stepKey}-title`}>Заголовок кроку</Label>
                  <Input
                    id={`quiz-${stepKey}-title`}
                    type="text"
                    value={step.title}
                    required
                    onChange={(event) => updateStep(stepKey, { title: event.target.value })}
                  />
                  <FieldError message={errorAt(stepIndex, "title")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`quiz-${stepKey}-subtitle`}>Підзаголовок кроку</Label>
                  <Input
                    id={`quiz-${stepKey}-subtitle`}
                    type="text"
                    value={step.subtitle ?? ""}
                    onChange={(event) => updateStep(stepKey, { subtitle: event.target.value })}
                  />
                  <FieldError message={errorAt(stepIndex, "subtitle")} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex w-fit items-center gap-2.5 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={step.isEnabled}
                    disabled={alwaysEnabled}
                    onChange={(event) => updateStep(stepKey, { isEnabled: event.target.checked })}
                    className="size-5 rounded border-2 border-input accent-primary disabled:opacity-50"
                  />
                  <span>Показувати у квізі</span>
                </label>
                {alwaysEnabled ? (
                  <p className="text-xs text-muted-foreground">{alwaysEnabledHint(stepKey)}</p>
                ) : null}
                <FieldError message={errorAt(stepIndex, "isEnabled")} />
              </div>

              {stepHasOptions(stepKey) ? (
                <div className="space-y-3">
                  {step.options.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      У цьому кроці немає варіантів. Додайте щонайменше два увімкнені — інакше крок
                      не збережеться.
                    </p>
                  ) : (
                    step.options.map((option, optionIndex) => {
                      const optionPrefix = `${stepPrefix}options.${optionIndex}.`;
                      const optionName = option.label.trim() || option.value;
                      const optionOtherErrors =
                        stepIndex < 0
                          ? []
                          : unhandledMessages(fieldErrors, optionPrefix, optionFieldKeys);

                      return (
                        <div
                          key={option.value}
                          className="space-y-4 rounded-xl border border-border bg-white p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="font-mono">
                              {option.value}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              код у базі — редагувати не можна
                            </span>

                            <span className="ml-auto flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={optionIndex === 0}
                                onClick={() => moveOption(stepKey, optionIndex, -1)}
                                aria-label={`Підняти варіант «${optionName}»`}
                              >
                                <ArrowUp className="size-4" aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={optionIndex === step.options.length - 1}
                                onClick={() => moveOption(stepKey, optionIndex, 1)}
                                aria-label={`Опустити варіант «${optionName}»`}
                              >
                                <ArrowDown className="size-4" aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(stepKey, option.value, optionName)}
                                aria-label={`Видалити варіант «${optionName}»`}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                            </span>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`quiz-${stepKey}-${option.value}-label`}>
                                Підпис
                              </Label>
                              <Input
                                id={`quiz-${stepKey}-${option.value}-label`}
                                type="text"
                                value={option.label}
                                required
                                onChange={(event) =>
                                  updateOption(stepKey, option.value, { label: event.target.value })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Те, що бачить відвідувач у квізі.
                              </p>
                              <FieldError message={errorAt(stepIndex, `options.${optionIndex}.label`)} />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`quiz-${stepKey}-${option.value}-emoji`}>Емодзі</Label>
                              <Input
                                id={`quiz-${stepKey}-${option.value}-emoji`}
                                type="text"
                                value={option.emoji ?? ""}
                                maxLength={8}
                                placeholder="🎈"
                                className="max-w-24"
                                onChange={(event) =>
                                  updateOption(stepKey, option.value, { emoji: event.target.value })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Необов’язково, до 8 символів.
                              </p>
                              <FieldError message={errorAt(stepIndex, `options.${optionIndex}.emoji`)} />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor={`quiz-${stepKey}-${option.value}-hint`}>Підказка</Label>
                              <Input
                                id={`quiz-${stepKey}-${option.value}-hint`}
                                type="text"
                                value={option.hint ?? ""}
                                placeholder="наприклад: найпопулярніше"
                                onChange={(event) =>
                                  updateOption(stepKey, option.value, { hint: event.target.value })
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Необов’язково, до 160 символів.
                              </p>
                              <FieldError message={errorAt(stepIndex, `options.${optionIndex}.hint`)} />
                            </div>
                          </div>

                          <label className="flex w-fit items-center gap-2.5 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={option.isEnabled}
                              onChange={(event) =>
                                updateOption(stepKey, option.value, {
                                  isEnabled: event.target.checked,
                                })
                              }
                              className="size-5 rounded border-2 border-input accent-primary"
                            />
                            <span>Показувати цей варіант</span>
                          </label>

                          {weightFields.length > 0 ? (
                            <div className="space-y-4 rounded-xl bg-muted/40 p-4">
                              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Розрахунок вартості
                              </p>
                              <div className="grid gap-4 sm:grid-cols-3">
                                {weightFields.map((field) => {
                                  const draftKey = weightKey(stepKey, option.value, field.key);
                                  const current = option.weights?.[field.key];

                                  return (
                                    <NumberField
                                      key={field.key}
                                      id={`quiz-${stepKey}-${option.value}-${field.key}`}
                                      label={field.label}
                                      hint={field.hint}
                                      text={
                                        numberDrafts[draftKey] ??
                                        (typeof current === "number" ? String(current) : "")
                                      }
                                      integer={field.integer}
                                      step={field.step}
                                      min={field.min}
                                      max={field.max}
                                      error={errorAt(
                                        stepIndex,
                                        `options.${optionIndex}.weights.${field.key}`,
                                      )}
                                      onTextChange={(text, parsed) => {
                                        setNumberDrafts((currentDrafts) => ({
                                          ...currentDrafts,
                                          [draftKey]: text,
                                        }));
                                        if (parsed !== null) {
                                          applyWeight(stepKey, option.value, field.key, parsed);
                                        }
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {optionOtherErrors.length > 0 ? (
                            <FormAlert message={optionOtherErrors.join(" · ")} />
                          ) : null}
                        </div>
                      );
                    })
                  )}

                  <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
                    {available.length > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor={`quiz-${stepKey}-add`}>
                          Додати варіант із дозволених кодів
                        </Label>
                        <Select
                          value={selectedCode}
                          onValueChange={(value) =>
                            setAddSelection((current) => ({ ...current, [stepKey]: value }))
                          }
                        >
                          <SelectTrigger id={`quiz-${stepKey}-add`} className="w-72">
                            <SelectValue placeholder="Оберіть код" />
                          </SelectTrigger>
                          <SelectContent>
                            {available.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code} — {defaultOption(stepKey, code)?.label ?? code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      variant="outline"
                      disabled={available.length === 0}
                      onClick={() => addOption(stepKey)}
                    >
                      <Plus className="size-5" aria-hidden="true" />
                      Додати варіант
                    </Button>
                  </div>

                  {available.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Усі дозволені коди цього кроку вже використані. Додати новий код можна лише зі
                      зміною схеми бази даних — інакше заявка не збережеться.
                    </p>
                  ) : null}

                  <FieldError message={errorAt(stepIndex, "options")} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Цей крок не має варіантів.</p>
              )}

              {stepOtherErrors.length > 0 ? (
                <FormAlert message={stepOtherErrors.join(" · ")} />
              ) : null}
            </CardContent>
          </Card>
        );
      })}

      {error ? <FormAlert message={error} /> : null}

      {saved && !dirty ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Збережено. Зміни вже показуються на сайті.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          «Скинути до типових» змінює лише форму — щоб застосувати типові значення, натисніть
          «Зберегти». Кнопка збереження активна тільки тоді, коли є зміни.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={resetToDefaults} disabled={pending}>
            <RotateCcw className="size-5" aria-hidden="true" />
            Скинути до типових
          </Button>
          <Button type="submit" disabled={pending || !dirty}>
            <Save className="size-5" aria-hidden="true" />
            {pending ? "Зберігаємо…" : "Зберегти"}
          </Button>
        </div>
      </div>
    </form>
  );
}
