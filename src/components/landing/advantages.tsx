import { Factory, Heart, ShieldCheck, Truck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ADVANTAGES } from "@/data/site-content";

import { SectionHeading } from "./section-heading";

const ICONS = {
  truck: Truck,
  shield: ShieldCheck,
  factory: Factory,
  heart: Heart,
} as const;

export function Advantages() {
  return (
    <section className="py-14 sm:py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Переваги"
          title="Чому обирають нас"
          description="Ми не посередники: самі закуповуємо гелій, самі оформлюємо — тому відповідаємо за кожну кульку."
        />

        <div className="mt-8 grid gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {ADVANTAGES.map((advantage) => {
            const Icon = ICONS[advantage.icon];

            return (
              <Card
                key={advantage.title}
                className="h-full transition duration-300 hover:-translate-y-1 hover:shadow-pop"
              >
                <CardContent className="flex flex-col gap-3 p-6">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Icon className="size-6 text-primary" aria-hidden />
                  </span>

                  <h3 className="font-display text-lg font-semibold">
                    {advantage.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {advantage.text}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
