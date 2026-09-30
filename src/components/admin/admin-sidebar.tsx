"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Images,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Package,
  Settings,
  Star,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Пункти навігації — єдине джерело і для посилань у сайдбарі, і для назви
 * поточної сторінки в шапці.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Заявки", icon: Inbox },
  { href: "/admin/packages", label: "Набори", icon: Package },
  { href: "/admin/quiz", label: "Квіз", icon: ListChecks },
  { href: "/admin/gallery", label: "Галерея", icon: Images },
  { href: "/admin/testimonials", label: "Відгуки", icon: Star },
  { href: "/admin/analytics", label: "Аналітика", icon: BarChart3 },
  { href: "/admin/settings", label: "Налаштування", icon: Settings },
];

/**
 * `/admin` — активний лише за точного збігу, інакше він підсвічувався б на
 * всіх сторінках одразу.
 */
export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Сайдбар адмінки.
 *
 * На великих екранах — вертикальний список, на мобільному — горизонтальна
 * прокрутка (без JS-стану: зайвий стан лише додав би розсинхрон при
 * переходах між сторінками).
 */
export function AdminSidebar({ login }: { login: string }) {
  const pathname = usePathname();

  return (
    <aside className="border-b border-border bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span
          className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand-blue text-base font-bold text-white"
          aria-hidden="true"
        >
          B
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-display text-sm font-semibold text-foreground">Balloon Magic</span>
          <span className="text-xs text-muted-foreground">Адмінка</span>
        </span>
      </div>

      <nav
        aria-label="Розділи адмінки"
        className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-4"
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isAdminNavItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-border px-4 py-4 lg:block">
        <p className="text-xs text-muted-foreground">Ви увійшли як</p>
        <p className="truncate text-sm font-medium text-foreground">{login}</p>
      </div>
    </aside>
  );
}
