import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

// answerCallbackQuery — подтверждает нажатие, убирает "часики" на кнопке
async function answerCallbackQuery(callbackId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

// Редактируем исходное сообщение (убираем кнопки)
async function editMessage(chatId: string, messageId: number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
}

// Публикация в Telegram-канал
async function postToChannel(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!botToken || !channelId) {
    console.log("[webhook] TELEGRAM_CHANNEL_ID не задан — пропуск поста в канал");
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: channelId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    console.error("[webhook] Channel post error:", await res.text());
  } else {
    console.log("[webhook] Пост опубликован в канал");
  }
}

// Сохранение статьи как опубликованной в KV
async function publishArticle(draftId: string, draftData: any) {
  if (!process.env.KV_REST_API_URL) return;
  
  const post = draftData.post;
  const postKey = `post:${post.slug}`;
  
  // Сохраняем статью
  await redis.set(postKey, JSON.stringify(post), { ex: 0 }); // без TTL — навсегда
  
  // Обновляем индекс статей
  const indexKey = "posts:index";
  const indexRaw = await redis.get(indexKey);
  const index: string[] = indexRaw ? JSON.parse(indexRaw as string) : [];
  if (!index.includes(post.slug)) {
    index.push(post.slug);
    await redis.set(indexKey, JSON.stringify(index), { ex: 0 });
  }
  
  // Удаляем черновик
  await redis.del(draftId);
  
  console.log(`[webhook] Статья опубликована: ${post.slug}`);
}

// Удаление черновика
async function rejectDraft(draftId: string) {
  if (!process.env.KV_REST_API_URL) return;
  await redis.del(draftId);
  console.log(`[webhook] Черновик удалён: ${draftId}`);
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    
    // Проверяем, что это callback_query (нажатие кнопки)
    if (!update.callback_query) {
      return NextResponse.json({ ok: true });
    }
    
    const callback = update.callback_query;
    const callbackId = callback.id;
    const data: string = callback.data || "";
    const chatId = callback.message?.chat?.id?.toString();
    const messageId = callback.message?.message_id;
    
    console.log(`[webhook] Callback: ${data} from chat ${chatId}`);
    
    // Парсим callback_data: "publish:draftId" или "reject:draftId"
    const [action, draftId] = data.split("|");
    
    if (action === "publish" && draftId) {
      // Читаем черновик из KV
      if (!process.env.KV_REST_API_URL) {
        await answerCallbackQuery(callbackId, "KV не настроен");
        return NextResponse.json({ ok: true });
      }
      
      const draftRaw = await redis.get(draftId);
      if (!draftRaw) {
        await answerCallbackQuery(callbackId, "Черновик не найден (истёк?)");
        if (chatId && messageId) {
          await editMessage(chatId, messageId, "❌ Черновик не найден (истёк срок 7 дней)");
        }
        return NextResponse.json({ ok: true });
      }
      
      const draftData = JSON.parse(draftRaw as string);
      
      // Публикуем
      await publishArticle(draftId, draftData);
      
      // Постим в Telegram-канал
      const channelPost = `${draftData.telegramPost}\n\n🩺 <b>Гурьянова В.А.</b> — невролог с 49-летним стажем\n<a href="https://doctorguryanova.ru/blog/${draftData.post.slug}">Читать статью на сайте</a>`;
      await postToChannel(channelPost);
      
      // Подтверждаем нажатие
      await answerCallbackQuery(callbackId, "✅ Опубликовано на сайт + в канал");
      
      // Редактируем исходное сообщение
      if (chatId && messageId) {
        await editMessage(chatId, messageId, `✅ <b>ОПУБЛИКОВАНО</b>\n\n<b>${draftData.post.title}</b>\n\n📖 На сайте: https://doctorguryanova.ru/blog/${draftData.post.slug}\n📢 В канале: @guryanova_neuro`);
      }
      
      console.log(`[webhook] Статья опубликована: ${draftData.post.title}`);
      
    } else if (action === "reject" && draftId) {
      // Удаляем черновик
      await rejectDraft(draftId);
      
      // Подтверждаем
      await answerCallbackQuery(callbackId, "❌ Отклонено");
      
      // Редактируем сообщение
      if (chatId && messageId) {
        await editMessage(chatId, messageId, "❌ Черновик отклонён и удалён");
      }
      
      console.log(`[webhook] Черновик отклонён: ${draftId}`);
      
    } else {
      await answerCallbackQuery(callbackId, "Неизвестное действие");
    }
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[webhook] error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
