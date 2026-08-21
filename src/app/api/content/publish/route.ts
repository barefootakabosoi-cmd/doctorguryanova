import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

function slugify(text: string): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };
  return text.toLowerCase()
    .replace(/[а-яё]/g, (c) => map[c] || c)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 80);
}

function calculateReadTime(content: string): number {
  const text = content.replace(/<[^>]+>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 200));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[publish] called, draftId:", body.draftId);
    
    const { draftId, post: rawPost, telegramPost } = body;

    if (!rawPost?.title || !rawPost?.content) {
      return NextResponse.json({ error: "Заполните title и content" }, { status: 400 });
    }

    if (!process.env.KV_REST_API_URL) {
      return NextResponse.json({ error: "KV not configured" }, { status: 500 });
    }

    const slug = (rawPost.slug && rawPost.slug.trim()) ? rawPost.slug.trim() : slugify(rawPost.title);
    const now = new Date().toISOString().split("T")[0];
    
    const post = {
      slug,
      title: rawPost.title,
      excerpt: rawPost.excerpt || "",
      content: rawPost.content,
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

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (botToken && channelId && telegramPost) {
      try {
        const channelMsg = `${telegramPost}\n\nГурьянова В.А. — невролог с 49-летним стажем\nЧитать на сайте: https://doctorguryanova.ru/blog/${slug}`;
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: channelId, text: channelMsg, disable_web_page_preview: true }),
        });
        if (!tgRes.ok) {
          console.error("[publish] Telegram error:", await tgRes.text());
        } else {
          console.log("[publish] posted to channel");
        }
      } catch (e) {
        console.error("[publish] Telegram error:", e);
      }
    }

    return NextResponse.json({ success: true, slug, url: `/blog/${slug}` });
  } catch (error: any) {
    console.error("[publish] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
