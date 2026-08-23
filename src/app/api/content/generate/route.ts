import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { generateArticle, generateArticleByKeyword } from "@/lib/content-pipeline";
import { getRandomCluster, keywordClusters } from "@/lib/seo-keywords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, keyword, random } = body;

    let generatedTopic = topic;
    let cluster;

    if (random) {
      cluster = getRandomCluster();
      generatedTopic = cluster.primary;
    } else if (keyword) {
      cluster = keywordClusters.find(k => k.primary === keyword || k.secondary.includes(keyword) || k.longtail.includes(keyword));
      generatedTopic = keyword;
    } else if (!topic) {
      return NextResponse.json({ error: "Укажите topic, keyword или random=true" }, { status: 400 });
    }

    console.log("[content/generate] Запуск генерации:", generatedTopic);

    const generated = await generateArticle(generatedTopic, cluster);

    const draftId = `draft-${Date.now()}`;
    if (process.env.KV_REST_API_URL) {
      await redis.set(draftId, JSON.stringify(generated), { ex: 86400 * 7 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const preview = `<b>📝 Новая статья для ревью</b>\n\n<b>Тема:</b> ${generated.post.title}\n<b>Тип:</b> ${generated.post.type === "research" ? "Научный обзор" : "Статья"}\n<b>Время чтения:</b> ${generated.post.readTime} мин\n\n<i>Черновик сохранён. ID: ${draftId}</i>`;

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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

    return NextResponse.json({
      success: true,
      draftId,
      post: generated.post,
      telegramPost: generated.telegramPost,
      seo: generated.seo,
      sources: generated.sources.map(s => ({ id: "pmid" in s ? s.pmid : s.doi, title: s.title, url: s.url })),
    });
  } catch (error: any) {
    console.error("[content/generate] error:", error);
    return NextResponse.json({ error: error.message || "Ошибка генерации" }, { status: 500 });
  }
}
