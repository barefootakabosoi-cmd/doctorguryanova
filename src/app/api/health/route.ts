import { NextResponse } from "next/server"

export async function GET() {
  const checks = {
    yookassa: {
      configured: !!(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY),
      shopIdSet: !!process.env.YOOKASSA_SHOP_ID,
      secretKeySet: !!process.env.YOOKASSA_SECRET_KEY,
    },
    telegram: {
      configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      tokenSet: !!process.env.TELEGRAM_BOT_TOKEN,
      chatIdSet: !!process.env.TELEGRAM_CHAT_ID,
    },
    smtp: {
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      hostSet: !!process.env.SMTP_HOST,
      userSet: !!process.env.SMTP_USER,
      passSet: !!process.env.SMTP_PASS,
    },
    gigachat: {
      configured: !!(process.env.GIGACHAT_CLIENT_ID && process.env.GIGACHAT_CLIENT_SECRET),
    },
  }

  const allOk = Object.values(checks).every((c: any) => c.configured)

  return NextResponse.json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
    message: allOk
      ? "Все сервисы настроены"
      : "Некоторые сервисы не настроены. Проверьте Vercel Environment Variables.",
  })
}
