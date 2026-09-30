import type { Package } from "@prisma/client";

import { DatabaseAlert } from "@/components/admin/database-alert";
import { PackagesManager, type PackageAdminItem } from "@/components/admin/packages-manager";
import { describeDbError, prisma } from "@/lib/prisma";

/**
 * Набори в адмінці: показуються всі, разом із прихованими — інакше
 * адміністратор не зміг би повернути набір на сайт.
 *
 * Читання йде напряму через Prisma (як на решті сторінок адмінки) і
 * загорнуте в `try/catch`: за недоступної бази сторінка рендерить
 * `DatabaseAlert` із порожнім списком, а не падає з 500.
 */
export default async function AdminPackagesPage() {
  let packages: PackageAdminItem[] = [];
  let dbError: string | null = null;

  try {
    const rows: Package[] = await prisma.package.findMany({ orderBy: { sortOrder: "asc" } });

    packages = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      priceFrom: row.priceFrom,
      description: row.description,
      features: row.features,
      imageUrl: row.imageUrl,
      isPopular: row.isPopular,
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
    }));
  } catch (error) {
    dbError = describeDbError(error);
  }

  return (
    <div className="space-y-6">
      {dbError ? <DatabaseAlert message={dbError} /> : null}

      <PackagesManager packages={packages} />
    </div>
  );
}
