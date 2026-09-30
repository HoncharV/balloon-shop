import { DatabaseAlert } from "@/components/admin/database-alert";
import { SettingsForm } from "@/components/admin/settings-form";
import { DEFAULT_SETTINGS } from "@/data/site-content";
import { describeDbError, prisma } from "@/lib/prisma";

import type { SettingsView } from "@/types/site";

/**
 * Налаштування сайту — один рядок із фіксованим `id = 1`.
 *
 * Якщо рядка ще немає (сід не виконано) або база недоступна, форма
 * заповнюється значеннями з `src/data/site-content.ts` — тими самими, які
 * лендінг показує як fallback. Так адміністратор бачить реальні значення,
 * а не порожні поля.
 */
export default async function AdminSettingsPage() {
  let settings: SettingsView = DEFAULT_SETTINGS;
  let dbError: string | null = null;

  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });

    if (row) {
      settings = {
        phone: row.phone,
        telegram: row.telegram,
        instagram: row.instagram,
        address: row.address,
        mapEmbedUrl: row.mapEmbedUrl,
        workingHours: row.workingHours,
        discountPercent: row.discountPercent,
      };
    }
  } catch (error) {
    dbError = describeDbError(error);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Контакти й параметри, які бачить клієнт: телефон, месенджери, адреса, графік роботи, карта
        та знижка після квіза.
      </p>

      {dbError ? <DatabaseAlert message={dbError} /> : null}

      <SettingsForm settings={settings} />
    </div>
  );
}
