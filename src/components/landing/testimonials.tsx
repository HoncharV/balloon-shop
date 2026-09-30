"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TestimonialView } from "@/types/site";

import { SectionHeading } from "./section-heading";

const AUTOPLAY_MS = 6000;

export function Testimonials({ items }: { items: TestimonialView[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [perPage, setPerPage] = useState(1);
  const [paused, setPaused] = useState(false);

  // На телефоні — одна картка, на широкому екрані — три
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const apply = () => setPerPage(query.matches ? 3 : 1);

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || items.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [items.length, paused, reduceMotion]);

  const visible = useMemo(() => {
    if (items.length === 0) return [];
    const count = Math.min(perPage, items.length);
    return Array.from(
      { length: count },
      (_, offset) => items[(index + offset) % items.length],
    );
  }, [index, items, perPage]);

  if (items.length === 0) return null;

  const showPrev = () =>
    setIndex((current) => (current - 1 + items.length) % items.length);
  const showNext = () => setIndex((current) => (current + 1) % items.length);

  return (
    <section id="testimonials" className="scroll-mt-24 py-14 sm:py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Думки клієнтів"
          title="Відгуки"
          description="Понад тисяча оформлених свят і багато клієнтів, які повертаються щороку."
        />

        <div
          className="mt-8 sm:mt-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="grid gap-5 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((testimonial, position) => (
                <motion.div
                  key={`${testimonial.id}-${position}`}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.35, delay: position * 0.05 }}
                  className="h-full"
                >
                  <Card className="flex h-full flex-col">
                    <CardContent className="flex h-full flex-col gap-4 p-6">
                      <div
                        className="flex gap-1"
                        aria-label={`Оцінка ${testimonial.rating} з 5`}
                      >
                        {Array.from({ length: 5 }, (_, starIndex) => (
                          <Star
                            key={starIndex}
                            aria-hidden
                            className={cn(
                              "size-4",
                              starIndex < testimonial.rating
                                ? "fill-brand-gold text-brand-gold"
                                : "text-muted-foreground/30",
                            )}
                          />
                        ))}
                      </div>

                      <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                        «{testimonial.text}»
                      </blockquote>

                      <div className="flex items-center gap-3">
                        {testimonial.photoUrl ? (
                          <img
                            src={testimonial.photoUrl}
                            alt={testimonial.name}
                            loading="lazy"
                            decoding="async"
                            className="size-11 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink to-brand-blue font-display text-lg font-bold text-white"
                          >
                            {testimonial.name.trim().charAt(0).toUpperCase()}
                          </span>
                        )}

                        <span className="flex flex-col">
                          <span className="font-semibold">{testimonial.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {testimonial.eventType}
                          </span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Попередній відгук"
              onClick={showPrev}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>

            <div className="flex items-center gap-2">
              {items.map((testimonial, dotIndex) => (
                <button
                  key={testimonial.id}
                  type="button"
                  aria-label={`Відгук ${dotIndex + 1}`}
                  aria-current={dotIndex === index}
                  onClick={() => setIndex(dotIndex)}
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-200",
                    dotIndex === index
                      ? "w-6 bg-primary"
                      : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60",
                  )}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Наступний відгук"
              onClick={showNext}
            >
              <ChevronRight className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
