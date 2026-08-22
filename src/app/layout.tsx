import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Гурьянова Валентина Андреевна — Невролог, рефлексотерапевт",
  description: "Онлайн-консультации невролога и рефлексотерапевта. 49 лет практики. Неврология, иглоукалывание, гирудотерапия, остеопатия.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased bg-white text-slate-900">
        {children}
      </body>
    </html>
  )
}
