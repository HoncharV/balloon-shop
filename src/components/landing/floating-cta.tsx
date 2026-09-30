"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Phone, Send } from "lucide-react";

import { trackEvent } from "@/components/analytics-tracker";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/constants";
import { telHref, telegramUrl } from "@/lib/links";

import type { SettingsView } from "@/types/site";

const SHOW_AFTER_PX = 600;

export function FloatingCta({ settings }: { settings: SettingsView }) {
  const reduceMotion = useReducedMotion();
  const [pastHero, setPastHero] = useState(false);
  const [contactsInView, setContactsInView] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const node = document.getElementById("contacts");
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => setContactsInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const visible = pastHero && !contactsInView;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={reduceMotion ? false : { y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? undefined : { y: 96, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="surface-glass mx-3 mb-3 flex items-center gap-3 rounded-2xl border p-3 shadow-pop">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="flex-1 bg-white"
            >
              <a
                href={telHref(settings)}
                onClick={() => trackEvent(ANALYTICS_EVENTS.PHONE_CLICK)}
              >
                <Phone className="size-5" aria-hidden />
                Подзвонити
              </a>
            </Button>

            <Button asChild size="lg" className="flex-1">
              <a
                href={telegramUrl(settings)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent(ANALYTICS_EVENTS.TELEGRAM_CLICK)}
              >
                <Send className="size-5" aria-hidden />
                Telegram
              </a>
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
