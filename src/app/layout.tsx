import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import "./globals.css";

/**
 * Шрифти.
 *
 * Unbounded (український дизайн, повна кирилиця) — для заголовків,
 * Inter — для тексту. `display: "swap"` обов'язковий: без нього текст
 * зникає на час завантаження шрифту (FOIT), що на мобільному виглядає
 * як зламана сторінка.
 */
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Balloon Magic — повітряні кульки, фотозони та оформлення свят у Києві",
    template: "%s · Balloon Magic",
  },
  description:
    "Повітряні кульки для будь-якого свята: доставка день у день, фотозони, арки та оформлення. Гарантія польоту 7 днів. Понад 1000 задоволених клієнтів.",
  keywords: [
    "повітряні кульки Київ",
    "гелієві кульки",
    "фотозона з кульок",
    "арка з кульок",
    "оформлення свят",
    "кульки на день народження",
    "гендер паті",
    "доставка кульок",
  ],
  authors: [{ name: "Balloon Magic" }],
  creator: "Balloon Magic",
  applicationName: "Balloon Magic",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: siteUrl,
    siteName: "Balloon Magic",
    title: "Balloon Magic — повітряні кульки для будь-якого свята",
    description:
      "Доставка кульок, фотозони та оформлення свят у Києві. Гарантія польоту 7 днів. Розрахуйте вартість за 1 хвилину.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Balloon Magic — повітряні кульки для будь-якого свята",
    description: "Доставка кульок, фотозони та оформлення свят у Києві.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: true, address: true },
  category: "shopping",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF69B4",
  // Щоб контент не «стрибав» під вирізами й динамічною адресною панеллю
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${inter.variable} ${unbounded.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        {/* Власний лічильник відвідувань — без сторонніх скриптів і cookie-банерів
            (використовується лише власний ідентифікатор відвідувача). */}
        <AnalyticsTracker />
      </body>
    </html>
  );
}
