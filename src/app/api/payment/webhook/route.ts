import { NextRequest } from "next/server"
import nodemailer from "nodemailer"

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

      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID
      if (botToken && chatId && bookingId) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ Оплата получена!\n\n💰 ${amount} ₽\n🆔 Бронь: ${bookingId}\n💳 Платёж: ${paymentId}\n\n🔗 Ссылка на консультацию:\n${jitsiLink || "сгенерируется позже"}`,
            parse_mode: "HTML",
          }),
        })
      }

      const smtpHost = process.env.SMTP_HOST
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS
      if (smtpHost && smtpUser && smtpPass && jitsiLink) {
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
              <p>Спасибо за запись! Ваша консультация оплачена.</p>
              <p><b>Сумма:</b> ${amount} ₽</p>
              <p><b>Ссылка на видеоконсультацию:</b></p>
              <p><a href="${jitsiLink}" style="display:inline-block;padding:12px 24px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px;">Присоединиться к консультации</a></p>
              <p style="color:#666;font-size:12px;">Откройте ссылку в Chrome/Firefox за 5 минут до начала. Разрешите доступ к камере и микрофону.</p>
            `,
          })
        }

        const doctorEmail = process.env.DOCTOR_EMAIL || smtpUser
        await transporter.sendMail({
          from: `"Запись Гурьянова" <${smtpUser}>`,
          to: doctorEmail,
          subject: `✅ Оплата: ${bookingId}`,
          html: `
            <p><b>Платёж получен:</b> ${amount} ₽</p>
            <p><b>ID:</b> ${bookingId}</p>
            <p><b>Ссылка Jitsi:</b> <a href="${jitsiLink}">${jitsiLink}</a></p>
          `,
        })
      }
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json({ received: true })
  }
}
