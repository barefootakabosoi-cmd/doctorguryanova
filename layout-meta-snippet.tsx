// src/app/layout.tsx — фрагмент с мета-тегами
// Вставь этот код в свой layout.tsx в объект metadata

export const metadata = {
  title: 'Гурьянова Валентина Андреевна — Невролог, рефлексотерапевт',
  description: 'Онлайн-консультации невролога с 49-летним стажем. Рефлексотерапия, гирудотерапия, индивидуальные программы лечения.',
  keywords: 'невролог, онлайн консультация, рефлексотерапия, гирудотерапия, мигрень, остеохондроз, головные боли',
  authors: [{ name: 'Гурьянова Валентина Андреевна' }],
  creator: 'Гурьянова Валентина Андреевна',
  metadataBase: new URL('https://doctorguryanova.ru'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://doctorguryanova.ru',
    siteName: 'Гурьянова Валентина Андреевна',
    title: 'Гурьянова Валентина Андреевна — Невролог',
    description: 'Онлайн-консультации невролога. 49 лет практики.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Гурьянова Валентина Андреевна — Невролог',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Гурьянова Валентина Андреевна — Невролог',
    description: 'Онлайн-консультации невролога. 49 лет практики.',
    images: ['/og-image.jpg'],
  },
  verification: {
    yandex: '4d3ba462f450909b',
    google: process.env.GOOGLE_VERIFICATION_CODE || '',
  },
};
