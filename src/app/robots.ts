import type { MetadataRoute } from "next";

/**
 * robots.txt.
 *
 * Адмінку й API закрито від індексації: сторінки /admin не мають
 * потрапляти в пошук, а /api тим паче. Додатково /admin закритий
 * `noindex` у своєму layout — одного шару тут мало.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
