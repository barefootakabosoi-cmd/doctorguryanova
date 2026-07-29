export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GIGACHAT_CLIENT_ID;
  const clientSecret = process.env.GIGACHAT_CLIENT_SECRET;

  const configured = !!(clientId && clientSecret);

  return NextResponse.json({
    configured,
    clientIdSet: !!clientId,
    clientSecretSet: !!clientSecret,
    scope: process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS",
    message: configured
      ? "GigaChat настроен. Используйте POST /api/ai/generate"
      : "GigaChat НЕ настроен. Добавьте GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET",
  });
}
