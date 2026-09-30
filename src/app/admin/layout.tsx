import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Адмінка · Balloon Magic",
  robots: { index: false, follow: false },
};

/**
 * Кореневий layout адмінки.
 *
 * Перевірки сесії тут НЕМАЄ: вона стоїть у layout групи `(dashboard)`,
 * завдяки чому `/admin/login` лишається доступним. Сюди ж винесено
 * `robots: noindex` — адмінка не має потрапляти в пошукові системи.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-muted/40">{children}</div>;
}
