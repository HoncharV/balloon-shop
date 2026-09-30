"use client";

import { Check } from "lucide-react";

import { trackEvent } from "@/components/analytics-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ANALYTICS_EVENTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PackageView } from "@/types/site";

import { SectionHeading } from "./section-heading";

const priceFormatter = new Intl.NumberFormat("uk-UA");

function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

export function Packages({ items }: { items: PackageView[] }) {
  if (items.length === 0) return null;

  return (
    <section id="packages" className="scroll-mt-24 py-14 sm:py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Набори"
          title="Готові набори"
          description="Три варіанти оформлення — від домашнього свята до повноцінної святкової локації. Будь-який набір адаптуємо під вашу кольорову гаму."
        />

        <div className="mt-8 grid gap-6 sm:mt-12 lg:grid-cols-3 lg:items-stretch">
          {items.map((item) => {
            const card = (
              <Card
                className={cn(
                  "flex h-full flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1",
                  item.isPopular ? "border-0 shadow-pop" : undefined,
                )}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="h-44 w-full object-cover sm:h-52"
                />

                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-2xl font-bold">{item.name}</h3>
                    {item.isPopular ? <Badge>Найпопулярніший</Badge> : null}
                  </div>

                  <p className="font-display text-xl font-bold text-primary">
                    від {formatPrice(item.priceFrom)} грн
                  </p>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </CardHeader>

                <CardContent className="flex-1 pt-0">
                  <ul className="flex flex-col gap-2.5">
                    {item.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button asChild size="lg" className="w-full">
                    <a
                      href="#calculator"
                      onClick={() =>
                        trackEvent(ANALYTICS_EVENTS.PACKAGE_ORDER, { slug: item.slug })
                      }
                    >
                      Замовити
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            );

            if (!item.isPopular) {
              return (
                <div key={item.id} className="h-full">
                  {card}
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="ring-gradient-brand h-full rounded-[1.2rem] p-[3px] shadow-soft lg:scale-105"
              >
                {card}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
