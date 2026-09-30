import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";
import { isAuthConfigured } from "@/lib/auth";

// Сторінка залежить лише від змінних середовища, які читаються під час
// старту сервера, тому її не можна віддавати зі статичного кешу.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вхід · Адмінка Balloon Magic",
  robots: { index: false, follow: false },
};

/**
 * `/admin/login` — єдина сторінка адмінки без перевірки сесії, інакше
 * увійти було б неможливо.
 */
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <LoginForm configured={isAuthConfigured()} />
    </main>
  );
}
