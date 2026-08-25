import { NextResponse } from "next/server"

export const dynamic = "force-dynamic";

// Не раскрываем наружу, какие сервисы сконфигурированы — только общий статус.
// Детали видны админу через /admin или Vercel dashboard.
export async function GET() {
  const yookassa = !!(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY)
  const telegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  const smtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  const gigachat = !!(process.env.GIGACHAT_CLIENT_ID && process.env.GIGACHAT_CLIENT_SECRET)
  const allOk = yookassa && telegram && smtp && gigachat

  return NextResponse.json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
  })
}
