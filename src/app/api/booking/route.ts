import { NextRequest } from "next/server"
import { Redis } from "@upstash/redis"
import { sendTelegramMessage, sendEmail } from "@/lib/notify"
import { esc } from "@/lib/utils"
import { parseBody, bookingSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
})

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, bookingSchema)
    if (!parsed.ok) return parsed.response
    const body = parsed.data
    const { date, time, consent } = body
    // Пользовательский ввод экранируем СРАЗУ — ниже он идёт в Telegram (HTML) и email (HTML)
    const direction = esc(body.direction)
    const symptoms = esc(body.symptoms)
    const name = esc(body.name)
    const phone = esc(body.phone)
    const email = typeof body.email === "string" ? esc(body.email) : undefined

    if (!direction || !date || !time || !name || !phone || !consent) {
      return Response.json({ error: "Заполните обязательные поля и дайте согласие" }, { status: 400 })
    }

    const bookingId = "NM-" + Date.now()
    const slotKey = `booking:${date}:${time}`

    // Атомарное бронирование: SET NX создаёт ключ ТОЛЬКО если слот свободен.
    // Два одновременных запроса не смогут занять одно время (гонка устранена).
    if (process.env.KV_REST_API_URL) {
      const acquired = await redis.set(slotKey, bookingId, { nx: true, ex: 86400 })
      if (!acquired) {
        return Response.json(
          { error: "Это время уже занято. Выберите другое." },
          { status: 409 }
        )
      }
    }

    try {
      await sendTelegramMessage(
        `🩺 Новая запись\n\n👤 ${name}\n📞 ${phone}\n📧 ${email || "не указан"}\n📋 ${direction}\n📅 ${date} в ${time}\n🆔 ${bookingId}\n📝 ${symptoms || "нет жалоб"}`
      )
    } catch (tgErr) {
      console.error("Telegram failed (non-fatal):", tgErr)
    }

    try {
      await sendEmail({
        subject: `Новая запись: ${name} — ${direction}`,
        html: `
          <h2>Новая запись на консультацию</h2>
          <p><b>Пациент:</b> ${name}</p>
          <p><b>Телефон:</b> ${phone}</p>
          <p><b>Email:</b> ${email || "не указан"}</p>
          <p><b>Направление:</b> ${direction}</p>
          <p><b>Дата и время:</b> ${date} в ${time}</p>
          <p><b>Симптомы:</b> ${symptoms || "не указаны"}</p>
          <p><b>ID брони:</b> ${bookingId}</p>
        `,
      })
    } catch (smtpErr) {
      console.error("SMTP failed (non-fatal):", smtpErr)
    }

    return Response.json({ success: true, id: bookingId })
  } catch (error) {
    console.error("Booking error:", error)
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
