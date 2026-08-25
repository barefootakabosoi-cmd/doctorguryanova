import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import sanitizeHtml from "sanitize-html";
import { slugify, calculateReadTime } from "@/lib/utils";
import { parseBody, contentPublishSchema } from "@/lib/validation";
import { sendTelegramMessage } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});



export async function POST(req: NextRequest) {
  try {
    const parsedBody = await parseBody(req, contentPublishSchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data;
    console.log("[publish] called, draftId:", body.draftId);
    
    const { draftId, post: rawPost, telegramPost } = body; // валидировано zod-схемой

    if (!process.env.KV_REST_API_URL) {
      return NextResponse.json({ error: "KV not configured" }, { status: 500 });
    }

    const slug = (rawPost.slug && rawPost.slug.trim()) ? rawPost.slug.trim() : slugify(rawPost.title);
    const now = new Date().toISOString().split("T")[0];
    
    const post = {
      slug,
      title: rawPost.title,
      excerpt: rawPost.excerpt || "",
      content: sanitizeHtml(rawPost.content, {
        allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "h1", "h2"],
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          a: ["href", "name", "target", "rel"],
        },
      }),
      keywords: rawPost.keywords || [],
      type: rawPost.type || "research",
      publishedAt: rawPost.publishedAt || now,
      updatedAt: now,
      readTime: rawPost.readTime || calculateReadTime(rawPost.content),
    };

    console.log("[publish] slug:", slug);

    const postKey = `post:${slug}`;
    await redis.set(postKey, JSON.stringify(post));
    console.log("[publish] saved:", postKey);

    const indexRaw = await redis.get("posts:index");
    let index: string[] = [];
    try {
      index = indexRaw ? (typeof indexRaw === "string" ? JSON.parse(indexRaw) : indexRaw) : [];
    } catch { index = []; }
    if (!Array.isArray(index)) index = [];
    if (!index.includes(slug)) {
      index.push(slug);
      await redis.set("posts:index", JSON.stringify(index));
      console.log("[publish] index updated:", index.length);
    }

    if (draftId) {
      await redis.del(draftId);
      console.log("[publish] draft deleted");
    }

    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (channelId && telegramPost) {
      const sent = await sendTelegramMessage(
        `${telegramPost}\n\nГурьянова В.А. — невролог с 49-летним стажем\nЧитать на сайте: https://doctorguryanova.ru/blog/${slug}`,
        { chatId: channelId, disablePreview: true }
      );
      if (sent) console.log("[publish] posted to channel");
    }

    return NextResponse.json({ success: true, slug, url: `/blog/${slug}` });
  } catch (error: any) {
    console.error("[publish] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
