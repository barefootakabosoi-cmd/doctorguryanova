import { NextResponse } from "next/server";
import { generateArticle } from "@/lib/content-pipeline";
import { getTopSearchQueries } from "@/lib/metrika";
import { keywordClusters, getRandomCluster } from "@/lib/seo-keywords";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function GET(req: Request) {
  // Защита: Vercel Cron отправляет заголовок Authorization
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron] Запуск автоматической генерации...");
    
    // 1. Получаем запросы из Метрики
    const metrikaQueries = await getTopSearchQueries();
    
    // 2. Ищем запрос, под который ещё нет статьи
    let chosenTopic = null;
    let chosenCluster = null;

    if (metrikaQueries.length > 0) {
      // Проверяем, есть ли уже статьи по этим запросам
      for (const query of metrikaQueries) {
        const slug = query.toLowerCase().replace(/[^a-zа-я0-9\s]/gi, '').trim().replace(/\s+/g, '-');
        const existing = await redis.get(`post:${slug}`);
        if (!existing) {
          // Нашли запрос с трафиком, под который нет статьи
          chosenTopic = query;
          // Ищем подходящий кластер
          chosenCluster = keywordClusters.find(k => 
            k.primary.includes(query) || 
            k.secondary.some(s => s.includes(query)) || 
            k.longtail.some(l => l.includes(query))
          );
          break;
        }
      }
    }

    // 3. Если в Метрике нет данных или всё уже покрыто — берём случайный
    if (!chosenTopic) {
      console.log("[cron] Нет новых запросов из Метрики, берём случайный");
      chosenCluster = getRandomCluster();
      chosenTopic = chosenCluster.primary;
    }

    console.log(`[cron] Выбрана тема: ${chosenTopic}`);

    // 4. Генерируем статью
    const generated = await generateArticle(chosenTopic, chosenCluster || undefined);
    
    const draftId = `draft-${Date.now()}`;
    if (process.env.KV_REST_API_URL) {
      await redis.set(draftId, JSON.stringify(generated), { ex: 86400 * 7 });
    }

    // 5. Отправляем в Telegram врачу
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (botToken && chatId) {
      const sourceText = metrikaQueries.includes(chosenTopic) 
        ? "📊 <i>Тема выбрана на основе поисковых запросов из Яндекс.Метрики</i>\n\n"
        : "🎲 <i>Случайная тема из семантического ядра</i>\n";

      const preview = `<b>🤖 Автоматическая генерация статьи</b>\n\n${sourceText}<b>Тема:</b> ${generated.post.title}\n<b>Время чтения:</b> ${generated.post.readTime} мин\n\n<i>Черновик сохранён. ID: ${draftId}</i>`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: preview,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Опубликовать", callback_data: `publish|${draftId}` }],
              [{ text: "📝 Открыть редактор", url: `https://doctorguryanova.ru/admin/content/${draftId}` }],
              [{ text: "❌ Отклонить", callback_data: `reject|${draftId}` }],
            ],
          },
        }),
      });
    }

    return NextResponse.json({ success: true, topic: chosenTopic, draftId });
  } catch (error: any) {
    console.error("[cron] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
