import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Accent = "pink" | "blue" | "gold" | "green";

const ACCENT_CLASSES: Record<Accent, string> = {
  pink: "bg-primary/10 text-primary",
  blue: "bg-secondary/30 text-[#1c6b8f]",
  gold: "bg-accent/20 text-[#8a6b00]",
  green: "bg-success/10 text-success",
};

/**
 * Картка з одним показником для дашборду й аналітики.
 *
 * Іконка передається як компонент (`icon={Inbox}`), а не як назва рядком:
 * тоді TypeScript перевіряє, що така іконка взагалі існує в lucide-react.
 * Серверний компонент — жодних хуків усередині немає.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "pink",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: Accent;
}) {
  const Icon = icon;

  return (
    <Card className="h-full">
      <CardContent className="flex items-start gap-4 p-5">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            ACCENT_CLASSES[accent],
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="font-display text-2xl leading-tight font-semibold text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
