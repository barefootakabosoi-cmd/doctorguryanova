import { NextRequest } from "next/server"
import nodemailer from "nodemailer"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { direction, date, time, symptoms, name, phone, email, consent } = body

    if (!direction || !date || !time || !name || !phone || !consent) {
      return Response.json({ error: "Заполните обязательные поля и дайте согласие" }, { status: 400 })
    }

    const slotKey = `booking:${date}:${time}`
    if (process.env.KV_REST_API_URL) {
      const existing = await redis.get(slotKey)
      if (existing) {
        return Response.json(
          { error: "Это время уже занято. Выберите другое." },
          { status: 409 }
        )
      }
    }

    const bookingId = "NM-" + Date.now()

    if (process.env.KV_REST_API_URL) {
      await redis.set(slotKey, bookingId, { ex: 86400 })
    }

    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID
      if (botToken && chatId) {
        const msg = `🩺 Новая запись\n\n👤 ${name}\n📞 ${phone}\n📧 ${email || "не указан"}\n📋 ${direction}\n📅 ${date} в ${time}\n🆔 ${bookingId}\n📝 ${symptoms || "нет жалоб"}`
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
        })
      }
    } catch (tgErr) {
      console.error("Telegram failed (non-fatal):", tgErr)
    }

    try {
      const smtpHost = process.env.SMTP_HOST
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS
      if (smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 465,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: { user: smtpUser, pass: smtpPass },
        })
        await transporter.sendMail({
          from: `"Запись Гурьянова" <${smtpUser}>`,
          to: process.env.DOCTOR_EMAIL || smtpUser,
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
      }
    } catch (smtpErr) {
      console.error("SMTP failed (non-fatal):", smtpErr)
    }

    return Response.json({ success: true, id: bookingId })
  } catch (error) {
    console.error("Booking error:", error)
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
