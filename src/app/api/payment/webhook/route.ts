import { NextRequest } from "next/server"
import { Redis } from "@upstash/redis"
import { esc } from "@/lib/utils"

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
})

function buildJitsiLink(room: string) {
  return `https://meet.jit.si/${room}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true`
}

// Случайная непредсказуемая комната для приватности консультации
async function getOrCreateJitsiLink(bookingId: string) {
  const key = `jitsi:${bookingId}`
  const saved = await redis.get<string>(key)
  if (saved) return buildJitsiLink(saved)
  const room = `guryanova-${crypto.randomUUID().slice(0, 8)}`
  await redis.set(key, room, { ex: 86400 })
  return buildJitsiLink(room)
}

export async function POST(request: NextRequest) {
  try {
    // Проверка подписи ЮKassa (Basic Auth: shopId:secretKey)
    // В тестовом режиме проверку пропускаем
    if (process.env.TEST_MODE !== "true") {
      const auth = request.headers.get("authorization") || ""
      if (!auth.startsWith("Basic ")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      }
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8")
      const [shopId, secretKey] = decoded.split(":")
      const expectedShopId = process.env.YOOKASSA_SHOP_ID
      const expectedSecretKey = process.env.YOOKASSA_SECRET_KEY
      if (!expectedShopId || !expectedSecretKey ||
          shopId !== expectedShopId || secretKey !== expectedSecretKey) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = await request.json()
    const { event, object } = body

    if (event === "payment.succeeded" && object?.status === "succeeded") {
      // Пользовательские данные экранируем сразу — ниже идут в Telegram/email (HTML)
      const bookingId = esc(object.metadata?.booking_id || "unknown")
      const paymentId = esc(object.id)
      const amount = object.amount?.value
      const patientEmail = esc(object.metadata?.patient_email || "не указан")
      const description = esc(object.description || "Консультация")

      console.log("Payment succeeded:", { bookingId, paymentId, amount })

      // Идемпотентность: ЮKassa может прислать payment.succeeded повторно.
      // SET NX — обрабатываем только первый вебхук, дубли игнорируем.
      if (process.env.KV_REST_API_URL) {
        const first = await redis.set(`paid:${paymentId}`, "1", { nx: true, ex: 60 * 60 * 24 * 90 })
        if (!first) {
          console.log("Duplicate webhook for", paymentId, "- skipped")
          return Response.json({ ok: true })
        }
      }

      const jitsiLink = await getOrCreateJitsiLink(bookingId)

      // 1. Telegram
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID
      if (botToken && chatId) {
        const msg = `<b>✅ ОПЛАТА ПОЛУЧЕНА</b>

💰 <b>Сумма:</b> ${amount} ₽
👤 <b>Услуга:</b> ${description}
📧 <b>Почта пациента:</b> ${patientEmail}
🆔 <b>ID брони:</b> <code>${bookingId}</code>

<b>🔽 ВАШИ ДЕЙСТВИЯ:</b>
1️⃣ Сохраните эту ссылку
2️⃣ За 10 минут до приёма отправьте ссылку пациенту
3️⃣ Нажмите на ссылку сами, чтобы войти в комнату как врач

🔗 <a href="${jitsiLink}"><b>ОТКРЫТЬ КОНСУЛЬТАЦИЮ</b></a>

<i>⚠️ Комната активна 24 часа. Не передавайте ссылку третьим лицам.</i>`

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML", disable_web_page_preview: true }),
        })
        if (!tgRes.ok) {
          console.error("Telegram send failed:", await tgRes.text())
        }
      }

      // 2. Email пациенту
      const smtpHost = process.env.SMTP_HOST
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS
      if (smtpHost && smtpUser && smtpPass && patientEmail && patientEmail !== "не указан") {
        try {
          const nodemailer = await import("nodemailer")
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 465,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: { user: smtpUser, pass: smtpPass },
          })
          await transporter.sendMail({
            from: `"Гурьянова В.А." <${smtpUser}>`,
            to: patientEmail,
            subject: "Подтверждение оплаты и ссылка на консультацию",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f766e;">Оплата подтверждена</h2>
                <p>Услуга: ${description}</p>
                <p>Сумма: <b>${amount} ₽</b></p>
                <div style="margin: 24px 0;">
                  <a href="${jitsiLink}" style="background: #0d9488; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
                    Присоединиться к консультации
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Откройте ссылку в Chrome или Firefox за 5 минут до начала.<br>
                  Разрешите доступ к камере и микрофону.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                <p style="color: #999; font-size: 12px;">
                  ID платежа: ${paymentId}<br>
                  По вопросам: <a href="https://t.me/Docguryanovabot">@Docguryanovabot</a>
                </p>
              </div>`,
          })
          console.log("Email sent to patient:", patientEmail)
        } catch (emailErr) {
          console.error("Email send failed:", emailErr)
        }
      }

      // 3. Email врачу
      if (smtpHost && smtpUser && smtpPass) {
        try {
          const nodemailer = await import("nodemailer")
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 465,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: { user: smtpUser, pass: smtpPass },
          })
          const doctorEmail = process.env.DOCTOR_EMAIL || smtpUser
          await transporter.sendMail({
            from: `"Запись Гурьянова" <${smtpUser}>`,
            to: doctorEmail,
            subject: `✅ Оплата ${amount} ₽ — ${description}`,
            html: `
              <p><b>Оплата получена</b></p>
              <p>Услуга: ${description}</p>
              <p>Сумма: ${amount} ₽</p>
              <p>Пациент: ${patientEmail}</p>
              <p>ID: ${bookingId}</p>
              <p><a href="${jitsiLink}">Jitsi-ссылка</a></p>
              <hr>
              <p><b>Инструкция:</b> отправьте ссылку пациенту за 10 минут до приёма.</p>`,
          })
        } catch (err) {
          console.error("Doctor email failed:", err)
        }
      }
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json({ received: true })
  }
}
