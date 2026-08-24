import type { Metadata } from "next"
import "./globals.css"
import CookieBanner from "@/components/CookieBanner"

export const metadata: Metadata = {
  title: "Гурьянова Валентина Андреевна — Невролог, рефлексотерапевт",
  description: "Онлайн-консультации невролога и рефлексотерапевта. 49 лет практики. Неврология, иглоукалывание, гирудотерапия, остеопатия.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased bg-cream text-charcoal">
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}
