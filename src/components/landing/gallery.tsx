"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { trackEvent } from "@/components/analytics-tracker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ANALYTICS_EVENTS,
  GALLERY_CATEGORY_LABELS,
  GALLERY_CATEGORY_ORDER,
} from "@/lib/constants";
import type { GalleryView } from "@/types/site";

import { SectionHeading } from "./section-heading";

const ALL_CATEGORIES = "ALL";

export function Gallery({ items }: { items: GalleryView[] }) {
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const visible = useMemo(
    () =>
      category === ALL_CATEGORIES
        ? items
        : items.filter((item) => item.category === category),
    [category, items],
  );

  const activeItem = activeIndex === null ? null : (visible[activeIndex] ?? null);

  const showPrev = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? current : (current - 1 + visible.length) % visible.length,
    );
  }, [visible.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? current : (current + 1) % visible.length,
    );
  }, [visible.length]);

  // Керування лайтбоксом зі клавіатури
  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") showNext();
      if (event.key === "ArrowLeft") showPrev();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, showPrev, showNext]);

  if (items.length === 0) return null;

  return (
    <section id="gallery" className="scroll-mt-24 bg-muted/40 py-14 sm:py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Портфоліо"
          title="Наші роботи"
          description="Понад тисяча оформлених свят: арки, фотозони, кульки з фольги та композиції просто неба."
        />

        <Tabs
          value={category}
          onValueChange={setCategory}
          className="mt-8 items-center sm:mt-10"
        >
          <TabsList>
            <TabsTrigger value={ALL_CATEGORIES}>Усі</TabsTrigger>
            {GALLERY_CATEGORY_ORDER.map((key) => (
              <TabsTrigger key={key} value={key}>
                {GALLERY_CATEGORY_LABELS[key] ?? key}
              </TabsTrigger>
            ))}
          </TabsList>

          <motion.div
            layout
            className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((item, index) => (
                <motion.button
                  key={item.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  onClick={() => {
                    setActiveIndex(index);
                    trackEvent(ANALYTICS_EVENTS.GALLERY_OPEN, { title: item.title });
                  }}
                  className="group relative aspect-square w-full overflow-hidden rounded-2xl border bg-muted shadow-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/85 via-foreground/45 to-transparent p-3 pt-10 text-left transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                    <span className="block text-sm font-semibold text-white">
                      {item.title}
                    </span>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </Tabs>

        <Dialog
          open={activeIndex !== null}
          onOpenChange={(open) => {
            if (!open) setActiveIndex(null);
          }}
        >
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-3xl gap-4 p-4 sm:p-6">
            {activeItem ? (
              <>
                <img
                  src={activeItem.imageUrl}
                  alt={activeItem.title}
                  className="max-h-[60vh] w-full rounded-xl object-contain"
                />

                <div className="flex flex-col gap-1">
                  <DialogTitle>{activeItem.title}</DialogTitle>
                  <DialogDescription>{activeItem.description}</DialogDescription>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Попереднє фото"
                    onClick={showPrev}
                  >
                    <ChevronLeft className="size-5" aria-hidden />
                  </Button>

                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {(activeIndex ?? 0) + 1} з {visible.length}
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Наступне фото"
                    onClick={showNext}
                  >
                    <ChevronRight className="size-5" aria-hidden />
                  </Button>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
