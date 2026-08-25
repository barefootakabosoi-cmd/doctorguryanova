import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { generateArticle, generateArticleByKeyword } from "@/lib/content-pipeline";
import { getRandomCluster, keywordClusters } from "@/lib/seo-keywords";
import { parseBody, contentGenerateSchema } from "@/lib/validation";
import { sendTelegramMessage } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseBody(req, contentGenerateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const { topic, keyword, random } = body;

    if (!random && !keyword && !topic) {
      return NextResponse.json({ error: "Укажите topic, keyword или random=true" }, { status: 400 });
    }

    let generatedTopic: string;
    let cluster;

    if (random) {
      cluster = getRandomCluster();
      generatedTopic = cluster.primary;
    } else if (keyword) {
      cluster = keywordClusters.find(k => k.primary === keyword || k.secondary.includes(keyword) || k.longtail.includes(keyword));
      generatedTopic = keyword;
    } else {
      generatedTopic = topic as string;
    }

    console.log("[content/generate] Запуск генерации:", generatedTopic);

    const generated = await generateArticle(generatedTopic, cluster);

    const draftId = `draft-${Date.now()}`;
    if (process.env.KV_REST_API_URL) {
      await redis.set(draftId, JSON.stringify(generated), { ex: 86400 * 7 });
    }

    await sendTelegramMessage(
      `<b>📝 Новая статья для ревью</b>\n\n<b>Тема:</b> ${generated.post.title}\n<b>Тип:</b> ${generated.post.type === "research" ? "Научный обзор" : "Статья"}\n<b>Время чтения:</b> ${generated.post.readTime} мин\n\n<i>Черновик сохранён. ID: ${draftId}</i>`,
      {
        disablePreview: true,
        replyMarkup: {
          inline_keyboard: [
            [{ text: "✅ Опубликовать", callback_data: `publish|${draftId}` }],
            [{ text: "📝 Открыть редактор", url: `https://doctorguryanova.ru/admin/content/${draftId}` }],
            [{ text: "❌ Отклонить", callback_data: `reject|${draftId}` }],
          ],
        },
      }
    );

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
