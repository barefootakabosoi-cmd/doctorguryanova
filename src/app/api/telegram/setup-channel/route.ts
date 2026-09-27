import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken || !channelId) {
    return NextResponse.json({ error: "Токен бота или ID канала не заданы в Vercel env" }, { status: 500 });
  }

  const text = `Добро пожаловать в профессиональный канал врача-невролога высшей категории <b>Гурьяновой Валентины Андреевны</b>!\n\n🏥 <b>Специализация:</b>\n• Неврология (головные боли, остеохондроз, невралгии)\n• Рефлексотерапия (иглоукалывание)\n• Гирудотерапия (лечение пиявками)\n• Остеопатия\n\n🎓 <b>Опыт:</b> 49 лет клинической практики. Выпускница 1-го МГМУ им. И.М. Сеченова.\n\n🌐 <b>Онлайн-консультации:</b>\nПринимаю пациентов из любой точки мира через видеосвязь. Для записи на приём перейдите на официальный сайт:\n👉 <a href="https://doctorguryanova.ru">doctorguryanova.ru</a>\n\n💬 <b>Есть вопрос?</b>\nНапишите нашему ассистенту @Docguryanovabot — он подскажет, с каким специалистом проконсультироваться, и поможет записаться на приём.\n\nЗдесь я делюсь экспертными статьями на основе научных исследований (PubMed) и своего клинического опыта.`;

  try {
    // 1. Отправляем сообщение
    const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    const sendData = await sendRes.json();
    if (!sendData.ok) {
      return NextResponse.json({ error: "Не удалось отправить пост", details: sendData }, { status: 500 });
    }

    const messageId = sendData.result.message_id;

    // 2. Закрепляем сообщение
    const pinRes = await fetch(`https://api.telegram.org/bot${botToken}/pinChatMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        message_id: messageId,
        disable_notification: true // Без уведомления всем подписчикам
      })
    });

    const pinData = await pinRes.json();

    if (pinData.ok) {
      return NextResponse.json({ success: true, message: "Пост успешно отправлен и закреплен в канале!" });
    } else {
      return NextResponse.json({ success: true, message: "Пост отправлен, но закрепить не удалось (возможно, нет прав). Закрепи вручную.", details: pinData });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
