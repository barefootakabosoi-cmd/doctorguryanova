import { NextRequest } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, description, returnUrl, bookingId, email } = body

    // ТЕСТОВЫЙ РЕЖИМ
    if (process.env.TEST_MODE === "true") {
      const jitsiLink = `https://meet.jit.si/guryanova-${bookingId}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true`

      // 1. Telegram врачу (синхронно, без setTimeout)
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        const chatId = process.env.TELEGRAM_CHAT_ID
        if (botToken && chatId) {
          const msg = `<b>🧪 ТЕСТОВАЯ ОПЛАТА (не реальные деньги)</b>

💰 <b>Сумма:</b> ${amount} ₽
👤 <b>Услуга:</b> ${description}
📧 <b>Почта:</b> ${email || "не указан"}
🆔 <b>ID:</b> <code>${bookingId}</code>

<b>🔽 ДЕЙСТВИЯ ВРАЧА:</b>
1️⃣ Сохраните ссылку
2️⃣ Отправьте пациенту за 10 минут до приёма
3️⃣ Нажмите сами, чтобы войти как врач

🔗 <a href="${jitsiLink}"><b>ОТКРЫТЬ КОНСУЛЬТАЦИЮ</b></a>

<i>⚠️ Это тест — деньги не списаны!</i>`
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML", disable_web_page_preview: true }),
          })
        }
      } catch (e) { console.error("Test Telegram error:", e) }

      // 2. Email пациенту (синхронно)
      try {
        const smtpHost = process.env.SMTP_HOST
        const smtpUser = process.env.SMTP_USER
        const smtpPass = process.env.SMTP_PASS
        if (smtpHost && smtpUser && smtpPass && email) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 465,
            secure: true,
            auth: { user: smtpUser, pass: smtpPass },
          })
          await transporter.sendMail({
            from: `"Гурьянова В.А." <${smtpUser}>`,
            to: email,
            subject: "Тестовая ссылка на консультацию",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f766e;">Тестовый режим</h2>
                <p>Услуга: ${description}</p>
                <p>Сумма: <b>${amount} ₽</b> (тест — деньги не списаны)</p>
                <div style="margin: 24px 0;">
                  <a href="${jitsiLink}" style="background: #0d9488; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">
                    Присоединиться к консультации
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Откройте ссылку в Chrome или Firefox за 5 минут до начала.<br>
                  Разрешите доступ к камере и микрофону.
                </p>
              </div>`,
          })
          console.log("Test email sent to:", email)
        }
      } catch (e) { console.error("Test email error:", e) }

      return Response.json({
        paymentUrl: `${returnUrl}&test=1`,
        paymentId: bookingId,
        testMode: true,
        jitsiLink,
      })
    }

    // БОЕВОЙ РЕЖИМ: реальная ЮKassa
    const shopId = process.env.YOOKASSA_SHOP_ID
    const secretKey = process.env.YOOKASSA_SECRET_KEY

    if (!shopId || !secretKey) {
      return Response.json(
        { error: "ЮKassa не настроена. Обратитесь к администратору сайта." },
        { status: 503 }
      )
    }

    if (!amount || amount <= 0) {
      return Response.json({ error: "Некорректная сумма платежа" }, { status: 400 })
    }

    const idempotenceKey = `${Date.now()}-${Math.random()}`

    const res = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
        "Idempotence-Key": idempotenceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { value: amount.toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: returnUrl },
        description,
        metadata: { booking_id: bookingId, patient_email: email },
        receipt: {
          customer: { email: email || "info@doctorguryanova.ru" },
          items: [{
            description: description,
            quantity: "1.00",
            amount: { value: amount.toFixed(2), currency: "RUB" },
            vat_code: 1,
          }],
        },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("YooKassa error:", data)
      return Response.json(
        { error: data.description || "Ошибка при создании платежа. Попробуйте позже." },
        { status: 400 }
      )
    }

    return Response.json({
      paymentUrl: data.confirmation.confirmation_url,
      paymentId: data.id,
    })
  } catch (error) {
    console.error("Payment create error:", error)
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
