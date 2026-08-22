import type { Metadata } from "next"
import Script from "next/script"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", weight: ["400", "500", "600", "700"], display: "swap" })

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
    yandex: "4d3ba462f450909b",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased">
        {children}

        {/* Yandex Metrika */}
        {process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID && (
          <Script id="yandex-metrika" strategy="afterInteractive">
            {`
              (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
              (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

              ym(${process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID}, "init", {
                  clickmap:true,
                  trackLinks:true,
                  accurateTrackBounce:true,
                  webvisor:true
              });
            `}
          </Script>
        )}

        {/* Schema.org JSON-LD */}
        <Script id="ld-json" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify({
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
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              reviewCount: "127",
            },
            priceRange: "₽₽",
          })}
        </Script>
      </body>
    </html>
  )
}
