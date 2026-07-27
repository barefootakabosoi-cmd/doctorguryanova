import type { Metadata } from "next"
import "./globals.css"
import CookieBanner from "@/components/CookieBanner"

export const metadata: Metadata = {
  title: "Гурьянова Валентина Андреевна — Невролог, рефлексотерапевт",
  description: "Онлайн-консультации невролога и рефлексотерапевта. 49 лет практики.",
  keywords: "невролог, рефлексотерапевт, гирудотерапевт, иглоукалывание, акупунктура, остеопатия, онлайн консультация врача",
  authors: [{ name: "Гурьянова В.А." }],
  openGraph: {
    title: "Гурьянова Валентина Андреевна — Невролог",
    description: "Онлайн-консультации. 49 лет практики.",
    url: "https://doctorguryanova.ru",
    siteName: "Doctor Guryanova",
    locale: "ru_RU",
    type: "website",
  },
  alternates: { canonical: "https://doctorguryanova.ru" },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased text-slate-900 bg-white">
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}
