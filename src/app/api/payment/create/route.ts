import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, description, returnUrl, bookingId, email } = body

    // ТЕСТОВЫЙ РЕЖИМ: пропускаем реальную оплату
    if (process.env.TEST_MODE === "true") {
      console.log("TEST MODE: skipping YooKassa, redirecting to success")
      
      // Имитируем webhook сразу (через 2 сек, чтобы success-страница успела загрузиться)
      setTimeout(async () => {
        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN
          const chatId = process.env.TELEGRAM_CHAT_ID
          const jitsiLink = `https://meet.jit.si/guryanova-${bookingId}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true`
          
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
              body: JSON.stringify({
                chat_id: chatId,
                text: msg,
                parse_mode: "HTML",
                disable_web_page_preview: true,
              }),
            })
          }
        } catch (e) {
          console.error("Test webhook error:", e)
        }
      }, 2000)

      return Response.json({
        paymentUrl: `${returnUrl}&test=1`,
        paymentId: bookingId,
        testMode: true,
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
        confirmation: {
          type: "redirect",
          return_url: returnUrl,
        },
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
    return Response.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    )
  }
}
