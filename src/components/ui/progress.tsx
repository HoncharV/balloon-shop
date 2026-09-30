import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = React.ComponentProps<"div"> & {
  value?: number;
  indicatorClassName?: string;
};

function Progress({
  className,
  indicatorClassName,
  value = 0,
  ...props
}: ProgressProps) {
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full bg-gradient-to-r from-primary to-brand-blue transition-all duration-500",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </div>
  );
}

export { Progress };
export type { ProgressProps };
