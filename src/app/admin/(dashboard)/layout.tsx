import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getAdminSession } from "@/lib/auth";
import { checkDatabase } from "@/lib/prisma";

/**
 * Каркас усіх захищених сторінок адмінки.
 *
 * Це єдина точка перевірки сесії: `(dashboard)` — route group, тому всі
 * сторінки всередині (Дашборд, Заявки, Галерея, Відгуки, Аналітика,
 * Налаштування) захищені одним `redirect`, а `/admin/login` лишається
 * поза групою й доступним.
 *
 * `checkDatabase()` не кидає виняток навіть за недоступної бази — вона
 * повертає пояснення, яке шапка показує індикатором. Завдяки цьому сам
 * каркас ніколи не дає 500.
 */
export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const database = await checkDatabase();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[110rem] flex-col lg:flex-row">
      <AdminSidebar login={session.login} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          login={session.login}
          databaseOk={database.ok}
          databaseMessage={database.message}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
