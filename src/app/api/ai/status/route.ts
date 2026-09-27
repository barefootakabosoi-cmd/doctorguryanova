export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  const configured = !!(process.env.GIGACHAT_CLIENT_ID && process.env.GIGACHAT_CLIENT_SECRET);
  return NextResponse.json({
    configured,
    message: configured
      ? "GigaChat настроен. Используйте POST /api/ai/generate"
      : "GigaChat не настроен. Добавьте GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET",
  });
}
