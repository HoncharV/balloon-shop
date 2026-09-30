import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker-образ будується з цього артефакту (див. Dockerfile).
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // next/image без sharp: SVG-ілюстрації та завантажені з адмінки фото
  // віддаються як є. Прибирає нативну залежність і проблеми зі shimmer.
  images: {
    unoptimized: true,
  },
  eslint: {
    // `next build` не має падати через лінт — лінт запускається окремо (`npm run lint`).
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
