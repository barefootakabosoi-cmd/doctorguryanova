import type { Metadata } from "next"
import "./globals.css"
import CookieBanner from "@/components/CookieBanner"
import YandexMetrika from "@/components/YandexMetrika"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Гурьянова Валентина Андреевна — Невролог, рефлексотерапевт",
    template: "%s | Доктор Гурьянова",
  },
  description:
    "Онлайн-консультации невролога и рефлексотерапевта. 49 лет практики. Неврология, иглоукалывание, гирудотерапия, остеопатия.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Доктор Гурьянова",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Доктор Гурьянова — невролог, рефлексотерапевт" }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased bg-cream text-charcoal">
        {children}
        <CookieBanner />
        <YandexMetrika />
      </body>
    </html>
  )
}
