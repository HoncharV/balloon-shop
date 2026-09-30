"use client";

import { usePathname } from "next/navigation";
import { Database, TriangleAlert } from "lucide-react";

import { ADMIN_NAV_ITEMS, isAdminNavItemActive } from "@/components/admin/admin-sidebar";
import { LogoutButton } from "@/components/admin/logout-button";
import { cn } from "@/lib/utils";

/** Назва поточної сторінки; для невідомого шляху — «Адмінка». */
function currentTitle(pathname: string): string {
  const match = ADMIN_NAV_ITEMS.find((item) => isAdminNavItemActive(pathname, item.href));
  return match?.label ?? "Адмінка";
}

/**
 * Шапка адмінки: назва сторінки, логін адміністратора, стан бази даних і
 * кнопка «Вийти».
 *
 * Показник бази приходить із серверного layout (`checkDatabase()`), тому
 * тут немає жодних запитів — лише відображення вже відомого стану.
 * Назва сторінки визначається з `usePathname()`: layout серверний і
 * поточного маршруту не знає.
 */
export function AdminHeader({
  login,
  databaseOk,
  databaseMessage,
}: {
  login: string;
  databaseOk: boolean;
  databaseMessage: string;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="min-w-0">
        <h1 className="truncate font-display text-lg font-semibold text-foreground">
          {currentTitle(pathname)}
        </h1>
        <p className="truncate text-xs text-muted-foreground">
          Ви увійшли як <span className="font-medium text-foreground">{login}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span
          title={databaseMessage}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            databaseOk
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {databaseOk ? (
            <Database className="size-3.5" aria-hidden="true" />
          ) : (
            <TriangleAlert className="size-3.5" aria-hidden="true" />
          )}
          <span className="whitespace-nowrap">
            {databaseOk ? "База доступна" : "База недоступна"}
          </span>
        </span>

        <LogoutButton />
      </div>
    </header>
  );
}
