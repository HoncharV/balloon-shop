import { AtSign, MapPin, Phone, Send } from "lucide-react";

import { instagramUrl, mapsLink, telHref, telegramUrl } from "@/lib/links";
import { formatUaPhone } from "@/lib/phone";
import type { SettingsView } from "@/types/site";

const QUICK_LINKS = [
  { href: "#quiz", label: "Квіз" },
  { href: "#gallery", label: "Наші роботи" },
  { href: "#packages", label: "Набори" },
  { href: "#calculator", label: "Калькулятор" },
  { href: "#testimonials", label: "Відгуки" },
  { href: "#contacts", label: "Контакти" },
];

export function SiteFooter({ settings }: { settings: SettingsView }) {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <img
                src="/images/logo.svg"
                alt=""
                aria-hidden
                className="size-11"
                loading="lazy"
                decoding="async"
              />
              <span className="font-display text-lg font-bold">Balloon Magic</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Повітряні кульки, фотозони та оформлення свят у Києві — з доставкою
              день у день.
            </p>
          </div>

          <nav aria-label="Швидкі посилання" className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase">
              Швидкі посилання
            </h2>
            <ul className="flex flex-col gap-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase">Контакти</h2>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href={telHref(settings)}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  <Phone className="size-4 shrink-0 text-primary" aria-hidden />
                  {formatUaPhone(settings.phone)}
                </a>
              </li>
              <li>
                <a
                  href={telegramUrl(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  <Send className="size-4 shrink-0 text-primary" aria-hidden />
                  @{settings.telegram}
                </a>
              </li>
              <li>
                <a
                  href={instagramUrl(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  <AtSign className="size-4 shrink-0 text-primary" aria-hidden />
                  @{settings.instagram}
                </a>
              </li>
              <li>
                <a
                  href={mapsLink(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {settings.address}
                </a>
              </li>
              <li className="text-sm text-muted-foreground">{settings.workingHours}</li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground sm:text-sm">
          © {new Date().getFullYear()} Balloon Magic. Усі права захищені.
        </p>
      </div>
    </footer>
  );
}
