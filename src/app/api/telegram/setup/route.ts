import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  const webhookUrl = "https://www.doctorguryanova.ru/api/telegram/webhook";

  // Регистрируем webhook в Telegram с секретным токеном:
  // без него вебхук отвергает запросы (см. src/app/api/telegram/webhook/route.ts)
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const params = new URLSearchParams({ url: webhookUrl, allowed_updates: '["message","callback_query"]' });
  if (webhookSecret) params.set("secret_token", webhookSecret);

  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?${params.toString()}`, {
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
