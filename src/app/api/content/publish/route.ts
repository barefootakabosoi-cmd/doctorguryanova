import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draftId, post, telegramPost } = body;

    if (!post?.slug || !post?.title || !post?.content) {
      return NextResponse.json({ error: "Заполните slug, title, content" }, { status: 400 });
    }

    if (!process.env.KV_REST_API_URL) {
      return NextResponse.json({ error: "KV not configured" }, { status: 500 });
    }

    // Сохраняем статью как опубликованную
    const postKey = `post:${post.slug}`;
    await redis.set(postKey, JSON.stringify(post), { ex: 0 });

    // Обновляем индекс
    const indexRaw = await redis.get("posts:index");
    const index: string[] = indexRaw ? JSON.parse(indexRaw as string) : [];
    if (!index.includes(post.slug)) {
      index.push(post.slug);
      await redis.set("posts:index", JSON.stringify(index), { ex: 0 });
    }

    // Удаляем черновик
    if (draftId) await redis.del(draftId);

    // Постим в Telegram-канал
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (botToken && channelId && telegramPost) {
      const channelMsg = `${telegramPost}\n\n🩺 <b>Гурьянова В.А.</b> — невролог с 49-летним стажем\n<a href="https://doctorguryanova.ru/blog/${post.slug}">Читать на сайте</a>`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: channelId, text: channelMsg, parse_mode: "HTML", disable_web_page_preview: true }),
      });
    }

    return NextResponse.json({ success: true, slug: post.slug, url: `/blog/${post.slug}` });
  } catch (error: any) {
    console.error("[publish] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
