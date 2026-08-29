import { NextRequest } from "next/server"
import { sendTelegramMessage, sendEmail } from "@/lib/notify"
import { getService } from "@/lib/services"
import { esc } from "@/lib/utils"
import { Redis } from "@upstash/redis"
import { parseBody, paymentCreateSchema } from "@/lib/validation";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
})

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, paymentCreateSchema)
    if (!parsed.ok) return parsed.response
    const { serviceId, returnUrl, bookingId, email } = parsed.data

    // Цена и название услуги берутся ТОЛЬКО из серверного каталога.
    // Клиентская сумма не доверенная — игнорируем её полностью.
    const service = getService(String(serviceId || ""))
    if (!service) {
      return Response.json(
        { error: "Неизвестная услуга. Выберите услугу из списка." },
        { status: 400 }
      )
    }
    const amount = service.price
    const description = service.name

    // ТЕСТОВЫЙ РЕЖИМ
    if (process.env.TEST_MODE === "true") {
      // Случайная непредсказуемая комната (приватность мед. консультации)
      const room = `guryanova-${crypto.randomUUID().slice(0, 8)}`
      await redis.set(`jitsi:${bookingId}`, room, { ex: 86400 })
      const jitsiLink = `https://meet.jit.si/${room}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true`

      // 1. Telegram врачу (синхронно, без setTimeout)
      try {
        await sendTelegramMessage(
`<b>🧪 ТЕСТОВАЯ ОПЛАТА (не реальные деньги)</b>

💰 <b>Сумма:</b> ${amount} ₽
👤 <b>Услуга:</b> ${description}
📧 <b>Почта:</b> ${esc(email || "не указан")}
🆔 <b>ID:</b> <code>${esc(bookingId)}</code>

<b>🔽 ДЕЙСТВИЯ ВРАЧА:</b>
1️⃣ Сохраните ссылку
2️⃣ Отправьте пациенту за 10 минут до приёма
3️⃣ Нажмите сами, чтобы войти как врач

🔗 <a href="${jitsiLink}"><b>ОТКРЫТЬ КОНСУЛЬТАЦИЮ</b></a>

<i>⚠️ Это тест — деньги не списаны!</i>`,
          { disablePreview: true }
        )
      } catch (e) { console.error("Test Telegram error:", e) }

      // 2. Email пациенту (синхронно)
      if (email) {
        try {
          const sent = await sendEmail({
            fromName: "Гурьянова В.А.",
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
          if (sent) console.log("Test email sent to:", email)
        } catch (e) { console.error("Test email error:", e) }
      }

      if (process.env.KV_REST_API_URL) {
        await redis.set(`paid:${bookingId}`, 'true');
        await redis.set(`jitsi:${bookingId}`, jitsiLink);
      }

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
