import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  const webhookUrl = "https://doctorguryanova.ru/api/telegram/webhook";

  // Регистрируем webhook в Telegram
  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`, {
    method: "POST",
  });
  const data = await res.json();

  if (!data.ok) {
    return NextResponse.json({ error: "Telegram setWebhook failed", details: data }, { status: 500 });
  }

  // Проверяем, что прописалось
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const info = await infoRes.json();

  return NextResponse.json({
    success: true,
    message: "Webhook registered",
    webhookUrl,
    info: info.result,
  });
}
