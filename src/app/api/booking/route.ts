export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { direction, date, time, symptoms, name, phone, email, price } = body

    // Валидация
    if (!direction || !date || !time || !name || !phone) {
      return Response.json({ error: "Заполните обязательные поля" }, { status: 400 })
    }

    // Здесь будет логика сохранения в БД и отправки уведомлений
    // TODO: подключить PostgreSQL через Prisma
    // TODO: отправка в Telegram
    // TODO: отправка email через SMTP

    console.log("Новая запись:", { direction, date, time, name, phone, email, price })

    // Отправка в Telegram (если настроены переменные окружения)
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (botToken && chatId) {
      const msg = `🩺 Новая запись на doctorguryanova.ru\n\n👤 ${name}\n📞 ${phone}\n📧 ${email || "не указан"}\n📋 ${direction}\n📅 ${date} в ${time}\n💰 ${price || "не указана"}\n📝 ${symptoms || "нет жалоб"}`
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
      })
    }

    return Response.json({ success: true, id: "NM-" + Date.now() })
  } catch (error) {
    console.error("Booking error:", error)
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
