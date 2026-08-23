import { NextResponse } from "next/server";
import { generateArticle } from "@/lib/content-pipeline";
import { getRandomCluster } from "@/lib/seo-keywords";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron] Запуск...");
    const cluster = getRandomCluster();
    const generated = await generateArticle(cluster.primary, cluster);

    const draftId = `draft-${Date.now()}`;
    if (process.env.KV_REST_API_URL) {
      await redis.set(draftId, JSON.stringify(generated), { ex: 86400 * 7 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const preview = `<b>🤖 Автогенерация</b>\n\n<b>Тема:</b> ${generated.post.title}\n<b>Время чтения:</b> ${generated.post.readTime} мин\n\n<i>Черновик: ${draftId}</i>`;
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

    return NextResponse.json({ success: true, draftId });
  } catch (error: any) {
    console.error("[cron] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
