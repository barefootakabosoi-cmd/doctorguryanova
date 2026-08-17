import { NextRequest } from "next/server"

function generateJitsiLink(bookingId: string) {
  const room = `guryanova-${bookingId}-${Date.now().toString(36)}`
  return `https://meet.jit.si/${room}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, object } = body

    if (event === "payment.succeeded" && object?.status === "succeeded") {
      const bookingId = object.metadata?.booking_id
      const paymentId = object.id
      const amount = object.amount?.value
      const patientEmail = object.metadata?.patient_email

      console.log("Payment succeeded:", { bookingId, paymentId, amount })

      const jitsiLink = bookingId ? generateJitsiLink(bookingId) : null

      // 1. Telegram: всегда отправляем, даже если email не работает
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID
      if (botToken && chatId) {
        const msg = `✅ Оплата получена!\\n\\n💰 ${amount} ₽\\n🆔 Бронь: ${bookingId}\\n💳 Платёж: ${paymentId}\\n🔗 Jitsi: ${jitsiLink || "нет ссылки"}`

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: "HTML",
          }),
        })

        if (!tgRes.ok) {
          console.error("Telegram send failed:", await tgRes.text())
        }
      }

      // 2. Email: если SMTP настроен
      const smtpHost = process.env.SMTP_HOST
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS

      if (smtpHost && smtpUser && smtpPass && jitsiLink) {
        const nodemailer = await import("nodemailer")
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPass },
        })

        if (patientEmail) {
          await transporter.sendMail({
            from: `"Гурьянова В.А." <${smtpUser}>`,
            to: patientEmail,
            subject: "Подтверждение оплаты и ссылка на консультацию",
            html: `
              <h2>Оплата подтверждена</h2>
              <p>Сумма: ${amount} ₽</p>
              <p><a href="${jitsiLink}" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Присоединиться к консультации</a></p>
              <p>Откройте ссылку в Chrome/Firefox за 5 минут до начала.</p>
            `,
          })
        }

        const doctorEmail = process.env.DOCTOR_EMAIL || smtpUser
        await transporter.sendMail({
          from: `"Запись Гурьянова" <${smtpUser}>`,
          to: doctorEmail,
          subject: `✅ Оплата: ${bookingId}`,
          html: `
            <p>Платёж: ${amount} ₽</p>
            <p>ID: ${bookingId}</p>
            <p><a href="${jitsiLink}">Jitsi</a></p>
          `,
        })
      } else {
        console.warn("SMTP not configured, skipping emails")
      }
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json({ received: true })
  }
}
