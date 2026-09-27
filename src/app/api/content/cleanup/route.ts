import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expectedBasic = `Basic ${Buffer.from(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASS}`).toString("base64")}`;
  const expectedBearer = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedBasic && authHeader !== expectedBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.KV_REST_API_URL) {
    return NextResponse.json({ error: "KV not configured" }, { status: 500 });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    // 1. Получаем закреплённое сообщение в TG (чтобы его не удалить)
    let pinnedMessageId = 0;
    if (botToken && channelId) {
      const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelId}`);
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        if (chatData.result?.pinned_message?.message_id) {
          pinnedMessageId = chatData.result.pinned_message.message_id;
        }
      }
    }

    // 2. Получаем индекс всех статей
    const indexRaw = await redis.get("posts:index");
    const index: string[] = indexRaw ? (typeof indexRaw === "string" ? JSON.parse(indexRaw) : indexRaw) : [];

    let deletedPosts = 0;
    let deletedTgMsgs = 0;

    // 3. Удаляем каждую статью и её TG-сообщение
    for (const slug of index) {
      // Удаляем статью из Redis
      await redis.del(`post:${slug}`);
      deletedPosts++;

      // Удаляем TG-сообщение, если оно есть
      const tgMsgId = await redis.get(`tg_msg:${slug}`);
      if (tgMsgId && botToken && channelId) {
        const msgId = parseInt(tgMsgId as string);
        if (msgId !== pinnedMessageId) {
          const delRes = await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: channelId, message_id: msgId }),
          });
          if (delRes.ok) deletedTgMsgs++;
        }
      }
      // Удаляем ID TG-сообщения из Redis
      await redis.del(`tg_msg:${slug}`);
    }

    // 4. Удаляем сам индекс статей
    await redis.del("posts:index");

    return NextResponse.json({ 
      success: true, 
      message: `Очистка завершена. Удалено статей: ${deletedPosts}, сообщений в TG: ${deletedTgMsgs}.`
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
