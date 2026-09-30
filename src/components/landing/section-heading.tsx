import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
};

/** Спільний заголовок секції: бейдж-«брова», заголовок і підзаголовок. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          {eyebrow}
        </span>
      ) : null}

      <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">{title}</h2>

      {description ? (
        <p
          className={cn(
            "max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg",
            align === "center" ? "mx-auto" : undefined,
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
