"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { sendJson } from "@/app/admin/_lib/api-client";
import { Button } from "@/components/ui/button";

/**
 * Вихід із адмінки.
 *
 * Cookie знімає сервер (`POST /api/admin/logout`), після чого клієнт
 * переходить на сторінку входу й скидає кеш роутера — інакше браузер міг
 * би показати закешований дашборд.
 */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await sendJson("/api/admin/logout", "POST");
    router.push("/admin/login");
    router.refresh();
    setPending(false);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={pending}
      aria-label="Вийти з адмінки"
    >
      <LogOut className="size-4" aria-hidden="true" />
      <span>{pending ? "Виходимо…" : "Вийти"}</span>
    </Button>
  );
}
