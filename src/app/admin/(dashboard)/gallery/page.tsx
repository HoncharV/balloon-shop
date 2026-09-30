import { DatabaseAlert } from "@/components/admin/database-alert";
import { GalleryManager, type GalleryAdminItem } from "@/components/admin/gallery-manager";
import { describeDbError, prisma } from "@/lib/prisma";

/**
 * Галерея: показуються всі фото, разом із неопублікованими — інакше
 * адміністратор не зміг би повернути фото на сайт.
 */
export default async function AdminGalleryPage() {
  let items: GalleryAdminItem[] = [];
  let dbError: string | null = null;

  try {
    const rows = await prisma.galleryItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      category: row.category,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch (error) {
    dbError = describeDbError(error);
  }

  return (
    <div className="space-y-6">
      {dbError ? <DatabaseAlert message={dbError} /> : null}
      <GalleryManager items={items} />
    </div>
  );
}
