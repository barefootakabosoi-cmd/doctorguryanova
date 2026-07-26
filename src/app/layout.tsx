import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Гурьянова Валентина Андреевна — Невролог, рефлексотерапевт",
  description: "Онлайн-консультации невролога и рефлексотерапевта. 49 лет практики. Неврология, иглоукалывание, гирудотерапия, остеопатия. Запись на приём.",
  keywords: "невролог, рефлексотерапевт, гирудотерапевт, иглоукалывание, акупунктура, остеопатия, онлайн консультация врача, головные боли, остеохондроз",
  authors: [{ name: "Гурьянова В.А." }],
  openGraph: {
    title: "Гурьянова Валентина Андреевна — Невролог",
    description: "Онлайн-консультации. 49 лет практики.",
    url: "https://doctorguryanova.ru",
    siteName: "Doctor Guryanova",
    locale: "ru_RU",
    type: "website",
  },
  alternates: {
    canonical: "https://doctorguryanova.ru",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Physician",
              name: "Гурьянова Валентина Андреевна",
              description: "Врач-невролог, рефлексотерапевт, гирудотерапевт",
              url: "https://doctorguryanova.ru",
              medicalSpecialty: ["Neurology", "Acupuncture", "Hirudotherapy"],
              address: {
                "@type": "PostalAddress",
                addressLocality: "Москва",
                addressCountry: "RU",
              },
              priceRange: "$$",
            }),
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  )
}
