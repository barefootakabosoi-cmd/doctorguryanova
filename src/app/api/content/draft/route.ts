import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const draftId = body.draftId || req.nextUrl.searchParams.get("draftId");
    if (!draftId) {
      return NextResponse.json({ error: "draftId required" }, { status: 400 });
    }
    if (!process.env.KV_REST_API_URL) {
      return NextResponse.json({ error: "KV not configured" }, { status: 500 });
    }
    // Читаем существующий черновик
    const existing = await redis.get(draftId);
    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    const draft = JSON.parse(existing as string);
    // Обновляем поля
    if (body.post) {
      draft.post = { ...draft.post, ...body.post };
    }
    if (body.titles) {
      draft.titles = { ...(draft.titles || {}), ...body.titles };
    }
    if (body.telegramPost !== undefined) {
      draft.telegramPost = body.telegramPost;
    }
    // Сохраняем
    await redis.set(draftId, JSON.stringify(draft), { ex: 86400 * 7 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const draftId = req.nextUrl.searchParams.get("draftId");
    console.log("[draft] GET draftId:", draftId);
    
    if (!draftId) {
      return NextResponse.json({ error: "draftId required" }, { status: 400 });
    }
    
    if (!process.env.KV_REST_API_URL) {
      console.log("[draft] KV_REST_API_URL not set");
      return NextResponse.json({ error: "KV not configured" }, { status: 500 });
    }
    
    const data = await redis.get(draftId);
    console.log("[draft] redis.get result type:", typeof data, "value:", data ? "exists" : "null");
    
    if (!data) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    
    // data может быть строкой или уже объектом (Upstash иногда десериализует)
    let parsed: any;
    try {
      parsed = typeof data === "string" ? JSON.parse(data) : data;
    } catch (e) {
      console.error("[draft] JSON.parse failed:", e, "data:", data);
      return NextResponse.json({ error: "Invalid draft data" }, { status: 500 });
    }
    
    console.log("[draft] returning draft, keys:", parsed.post ? Object.keys(parsed.post) : "no post");
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("[draft] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
