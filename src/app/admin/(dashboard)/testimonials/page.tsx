import { DatabaseAlert } from "@/components/admin/database-alert";
import {
  TestimonialsManager,
  type TestimonialAdminItem,
} from "@/components/admin/testimonials-manager";
import { describeDbError, prisma } from "@/lib/prisma";

/**
 * Відгуки: показуються всі, разом із неопублікованими, за порядком
 * сортування — тим самим, за яким їх будує лендінг.
 */
export default async function AdminTestimonialsPage() {
  let items: TestimonialAdminItem[] = [];
  let dbError: string | null = null;

  try {
    const rows = await prisma.testimonial.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      photoUrl: row.photoUrl,
      text: row.text,
      rating: row.rating,
      eventType: row.eventType ?? "",
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
      <TestimonialsManager items={items} />
    </div>
  );
}
