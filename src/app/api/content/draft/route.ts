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
  const draftId = req.nextUrl.searchParams.get("draftId");
  if (!draftId) {
    return NextResponse.json({ error: "draftId required" }, { status: 400 });
  }
  
  if (!process.env.KV_REST_API_URL) {
    return NextResponse.json({ error: "KV not configured" }, { status: 500 });
  }
  
  const data = await redis.get(draftId);
  if (!data) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  
  return NextResponse.json(JSON.parse(data as string));
}
