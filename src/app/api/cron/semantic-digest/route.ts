import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getTopSearchQueries } from "@/lib/metrika";
import { getAllPosts } from "@/lib/blog-data";
import { findOpportunities, queryId, type PostCover } from "@/lib/semantics";
import { sendTelegramMessage } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

/**
 * Еженедельный семантический дайджест.
 * Метрика (реальные поисковые фразы) → сопоставление со статьями блога
 * → топ пробелов в семантике → сообщение врачу с кнопками
 * «Сгенерировать статью по запросу» / «Пропустить».
 *
 * Деплой-безопасно: без YANDEX_METRIKA_TOKEN просто уходит уведомление
 * «Метрика не настроена» (или ничего, если и Telegram не настроен).
 */
export async function GET() {
  try {
    const queries = await getTopSearchQueries(14, 50);

    if (queries.length === 0) {
      await sendTelegramMessage(
        "🤖 <b>Семантический дайджест</b>\n\nНет данных: проверь переменные YANDEX_METRIKA_TOKEN и YANDEX_METRIKA_COUNTER_ID в Vercel (и что счётчик установлен на сайт).",
        { disablePreview: true }
      );
      return NextResponse.json({ ok: true, reason: "no-metrika-data" });
    }

    const posts = await getAllPosts();
    const covers: PostCover[] = posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      keywords: p.keywords,
    }));

    const opportunities = findOpportunities(queries, covers, { limit: 8 });

    // Помечаем показанные, чтобы не предлагать одно и то же каждую неделю
    const shownKey = "digest:shown";
    const shown = new Set<string>(
      process.env.KV_REST_API_URL ? ((await redis.get(shownKey)) as string[] | null) ?? [] : []
    );
    const fresh = opportunities.filter((o) => !shown.has(queryId(o.phrase))).slice(0, 5);

    if (fresh.length === 0) {
      await sendTelegramMessage(
        `🤖 <b>Семантический дайджест</b>\n\nНовых пробелов нет — все заметные запросы из топа покрыты статьями (${queries.length} фраз проанализировано).`,
        { disablePreview: true }
      );
      return NextResponse.json({ ok: true, analyzed: queries.length, fresh: 0 });
    }

    const lines = fresh.map(
      (o, i) => `${i + 1}. «${o.phrase}» — ${o.visits} визит(ов) за 14 дней`
    );

    await sendTelegramMessage(
      [
        "🤖 <b>Семантический дайджест недели</b>",
        "",
        `Проанализировано ${queries.length} поисчных фраз. Эти запросы приводят людей на сайт, но статей под них нет:`,
        "",
        ...lines,
        "",
        "<i>Кнопка ниже создаст черновик статьи по запросу (PubMed + GigaChat) и пришлёт его на ревью.</i>",
      ].join("\n"),
      {
        disablePreview: true,
        replyMarkup: {
          inline_keyboard: [
            ...fresh.map((o) => [
              { text: `📝 «${o.phrase.slice(0, 40)}»`, callback_data: `kwgen|${queryId(o.phrase)}` },
            ]),
          ],
        },
      }
    );

    if (process.env.KV_REST_API_URL) {
      for (const o of fresh) {
        // Фраза живёт 7 дней — за это время врач должен нажать кнопку
        await redis.set(`kw:${queryId(o.phrase)}`, o.phrase, { ex: 86400 * 7 });
        shown.add(queryId(o.phrase));
      }
      await redis.set(shownKey, Array.from(shown), { ex: 86400 * 120 });
    }

    return NextResponse.json({ ok: true, analyzed: queries.length, sent: fresh.length });
  } catch (error: any) {
    console.error("[semantic-digest] error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
