"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Send } from "lucide-react";

import { trackEvent } from "@/components/analytics-tracker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ANALYTICS_EVENTS } from "@/lib/constants";
import { telegramUrl } from "@/lib/links";
import { cn } from "@/lib/utils";
import type { SettingsView } from "@/types/site";

const NAV_ITEMS = [
  { href: "#quiz", label: "Квіз" },
  { href: "#gallery", label: "Наші роботи" },
  { href: "#packages", label: "Набори" },
  { href: "#calculator", label: "Калькулятор" },
  { href: "#testimonials", label: "Відгуки" },
  { href: "#contacts", label: "Контакти" },
];

export function SiteHeader({
  settings,
  variant = "landing",
}: {
  settings: SettingsView;
  variant?: "landing" | "minimal";
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const telegramHref = telegramUrl(settings);

  return (
    <header
      className={cn(
        "surface-glass sticky top-0 z-40 w-full border-b transition-all duration-300",
        scrolled ? "border-border shadow-soft" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <img src="/images/logo.svg" alt="" aria-hidden className="size-10 lg:size-11" />
          <span className="font-display text-lg font-bold tracking-tight lg:text-xl">
            Balloon Magic
          </span>
        </Link>

        {variant === "minimal" ? (
          <Button asChild variant="outline" className="h-11">
            <Link href="/">На сайт</Link>
          </Button>
        ) : (
          <>
            <nav
              aria-label="Основна навігація"
              className="hidden items-center gap-1 lg:flex"
            >
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Button asChild size="lg" className="hidden h-11 sm:inline-flex">
                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent(ANALYTICS_EVENTS.TELEGRAM_CLICK)}
                >
                  <Send className="size-4" aria-hidden />
                  Написати в Telegram
                </a>
              </Button>

              <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Відкрити меню"
                  >
                    <Menu className="size-5" aria-hidden />
                  </Button>
                </DialogTrigger>

                <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm gap-5">
                  <DialogTitle className="text-center">Меню</DialogTitle>

                  <nav aria-label="Мобільна навігація" className="flex flex-col gap-1">
                    {NAV_ITEMS.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-12 items-center rounded-xl px-4 text-base font-medium transition-colors duration-200 hover:bg-muted"
                      >
                        {item.label}
                      </a>
                    ))}
                  </nav>

                  <Button asChild size="lg" className="w-full">
                    <a
                      href={telegramHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        trackEvent(ANALYTICS_EVENTS.TELEGRAM_CLICK);
                        setMenuOpen(false);
                      }}
                    >
                      <Send className="size-4" aria-hidden />
                      Написати в Telegram
                    </a>
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
