import type { MetadataRoute } from "next";

/**
 * sitemap.xml.
 *
 * Сайт — одна сторінка (лендінг), тому в карті рівно одна адреса.
 * Секції-якорі (#quiz, #packages) свідомо НЕ додаються: для пошукових
 * систем вони не окремі сторінки, і їх наявність лише розмиває карту.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
