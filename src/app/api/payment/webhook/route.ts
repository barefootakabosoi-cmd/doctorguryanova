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
      const bookingId = object.metadata?.booking_id || "unknown"
      const paymentId = object.id
      const amount = object.amount?.value
      const patientEmail = object.metadata?.patient_email || "не указан"
      const description = object.description || "Консультация"

      console.log("Payment succeeded:", { bookingId, paymentId, amount, patientEmail })

      const jitsiLink = generateJitsiLink(bookingId)

      // 1. Telegram: красивое сообщение врачу
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID
      if (botToken && chatId) {
        const msg = `<b>✅ Оплата получена</b>

💰 <b>Сумма:</b> ${amount} ₽
👤 <b>Пациент:</b> ${description}
📧 <b>Email:</b> ${patientEmail}
🆔 <b>Бронь:</b> <code>${bookingId}</code>
💳 <b>Платёж:</b> <code>${paymentId}</code>

🔗 <a href="${jitsiLink}"><b>ССЫЛКА НА КОНСУЛЬТАЦИЮ</b></a>

<i>Отправьте ссылку пациенту за 10 минут до начала</i>`

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        })

        if (!tgRes.ok) {
          console.error("Telegram send failed:", await tgRes.text())
        }
      }

      // 2. Email пациенту (если SMTP настроен)
      const smtpHost = process.env.SMTP_HOST
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS

      if (smtpHost && smtpUser && smtpPass && patientEmail && patientEmail !== "не указан") {
        try {
          const nodemailer = await import("nodemailer")
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 465,
            secure: true,
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
                  Откройте ссылку в <b>Chrome или Firefox</b> за 5 минут до начала.<br>
                  Разрешите доступ к камере и микрофону при входе.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                <p style="color: #999; font-size: 12px;">
                  ID платежа: ${paymentId}<br>
                  По вопросам: <a href="https://t.me/Docguryanovabot">@Docguryanovabot</a>
                </p>
              </div>
            `,
          })
          console.log("Email sent to patient:", patientEmail)
        } catch (emailErr) {
          console.error("Email send failed:", emailErr)
        }
      } else {
        console.warn("SMTP not configured or email missing, skipping emails")
      }

      // 3. Email врачу (если SMTP настроен)
      if (smtpHost && smtpUser && smtpPass) {
        try {
          const nodemailer = await import("nodemailer")
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 465,
            secure: true,
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
            `,
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
