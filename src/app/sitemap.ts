import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://doctorguryanova.ru"
  const now = new Date()

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/nevrologiya/`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/refleksoterapiya/`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/girudoterapiya/`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/manualnaya-terapiya/`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/osteopatiya/`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/requisites/`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy/`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/payment/success/`, lastModified: now, changeFrequency: "never", priority: 0.1 },
  ]
}
