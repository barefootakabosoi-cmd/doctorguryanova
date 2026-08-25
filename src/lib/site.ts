// Канонический URL сайта. Используется только на сервере (metadataBase, JSON-LD),
// поэтому без префикса NEXT_PUBLIC_ — Vercel не предупреждает об экспозиции в браузер.
export const SITE_URL = process.env.SITE_URL || "https://doctorguryanova.ru"
