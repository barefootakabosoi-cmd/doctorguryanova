import type { Metadata } from "next"
import "./globals.css"
import CookieBanner from "@/components/CookieBanner"

export const metadata: Metadata = {
  metadataBase: new URL("https://doctorguryanova.ru"),
  title: {
    default: "Гурьянова Валентина Андреевна — Невролог, рефлексотерапевт",
    template: "%s — Гурьянова В.А.",
  },
  description: "Онлайн-консультации невролога и рефлексотерапевта. 49 лет практики. Неврология, иглоукалывание, гирудотерапия, остеопатия. Запись на приём.",
  keywords: ["невролог", "рефлексотерапевт", "гирудотерапевт", "иглоукалывание", "акупунктура", "остеопатия", "онлайн консультация врача", "головные боли", "остеохондроз", "москва"],
  authors: [{ name: "Гурьянова В.А." }],
  creator: "Гурьянова Валентина Андреевна",
  publisher: "doctorguryanova.ru",
  formatDetection: { telephone: true, email: true },
  openGraph: {
    title: "Гурьянова Валентина Андреевна — Невролог",
    description: "Онлайн-консультации. 49 лет практики. Неврология, рефлексотерапия, гирудотерапия.",
    url: "https://doctorguryanova.ru",
    siteName: "Doctor Guryanova",
    locale: "ru_RU",
    type: "website",
    images: [{
      url: "https://doctorguryanova.ru/og-image.jpg",
      width: 1200,
      height: 630,
      alt: "Гурьянова Валентина Андреевна — Невролог",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Гурьянова Валентина Андреевна — Невролог",
    description: "Онлайн-консультации. 49 лет практики.",
    images: ["https://doctorguryanova.ru/og-image.jpg"],
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
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    yandex: "YANDEX_VERIFICATION_CODE",
    google: "GOOGLE_VERIFICATION_CODE",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Physician",
              name: "Гурьянова Валентина Андреевна",
              description: "Невролог, рефлексотерапевт, гирудотерапевт. 49 лет стажа.",
              url: "https://doctorguryanova.ru",
              telephone: "+79161004053",
              email: "info@doctorguryanova.ru",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Москва",
                addressCountry: "RU",
              },
              medicalSpecialty: ["Neurology", "Acupuncture", "Osteopathic"],
              availableService: {
                "@type": "MedicalProcedure",
                name: "Онлайн-консультация невролога",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "127",
              },
              priceRange: "₽₽",
            }),
          }}
        />
      </head>
      <body className="antialiased text-slate-900 bg-white">
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}
