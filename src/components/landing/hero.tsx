"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Calculator, Phone, Send } from "lucide-react";

import { trackEvent } from "@/components/analytics-tracker";
import { Button } from "@/components/ui/button";
import { HERO_STATS } from "@/data/site-content";
import { ANALYTICS_EVENTS } from "@/lib/constants";
import { telHref, telegramUrl } from "@/lib/links";
import { formatUaPhone } from "@/lib/phone";

import type { SettingsView } from "@/types/site";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Hero({ settings }: { settings: SettingsView }) {
  const reduceMotion = useReducedMotion();
  const telegramHref = telegramUrl(settings);

  return (
    <section className="relative isolate overflow-hidden pt-8 pb-14 sm:pt-12 lg:pt-16 lg:pb-24">
      {/* Декоративний шар: арт із кульок і розмиті градієнтні плями */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float-slow absolute -top-10 right-[-12%] w-[72%] max-w-[560px] opacity-40 sm:right-[-6%] lg:opacity-60">
          <img src="/images/hero.svg" alt="" className="h-auto w-full" />
        </div>
        <div className="animate-blob absolute -top-24 -left-24 size-[24rem] rounded-full bg-brand-pink/25 blur-3xl" />
        <div className="animate-blob absolute top-32 -right-20 size-[20rem] rounded-full bg-brand-blue/25 blur-3xl [animation-delay:3s]" />
        <div className="animate-blob absolute -bottom-16 left-1/3 size-[18rem] rounded-full bg-brand-gold/20 blur-3xl [animation-delay:6s]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={container}
          initial={reduceMotion ? false : "hidden"}
          animate="show"
          className="max-w-3xl"
        >
          <motion.p
            variants={item}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold tracking-wide text-primary uppercase shadow-soft sm:text-sm"
          >
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            Свято під ключ у Києві
          </motion.p>

          <motion.h1
            variants={item}
            className="mt-5 text-4xl leading-[1.06] font-bold sm:text-5xl lg:text-6xl"
          >
            Повітряні кульки{" "}
            <span className="text-gradient-brand">для будь-якого свята</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl"
          >
            Доставка кульок, фотозони та оформлення свят
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button asChild size="xl" className="w-full sm:w-auto">
              <a href="#calculator">
                <Calculator className="size-5" aria-hidden />
                Розрахувати вартість
              </a>
            </Button>

            <Button asChild size="xl" variant="outline" className="w-full sm:w-auto">
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent(ANALYTICS_EVENTS.TELEGRAM_CLICK)}
              >
                <Send className="size-5" aria-hidden />
                Написати в Telegram
              </a>
            </Button>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground"
          >
            <span>Або одразу телефонуйте:</span>
            <a
              href={telHref(settings)}
              onClick={() => trackEvent(ANALYTICS_EVENTS.PHONE_CLICK)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold text-foreground transition-colors duration-200 hover:text-primary"
            >
              <Phone className="size-4 text-primary" aria-hidden />
              {formatUaPhone(settings.phone)}
            </a>
          </motion.div>
        </motion.div>

        <motion.dl
          variants={container}
          initial={reduceMotion ? false : "hidden"}
          animate="show"
          className="mt-10 grid grid-cols-3 gap-3 rounded-2xl border bg-white/75 p-4 shadow-soft sm:mt-14 sm:gap-6 sm:p-6"
        >
          {HERO_STATS.map((stat) => (
            <motion.div key={stat.label} variants={item} className="text-center sm:text-left">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="font-display block text-lg font-bold text-primary sm:text-2xl">
                  {stat.value}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">
                  {stat.label}
                </span>
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
