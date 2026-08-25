// src/lib/metrika.ts
// Получение поисковых запросов из Яндекс.Метрики (API отчётов)

export interface SearchQuery {
  phrase: string;
  visits: number;
}

/**
 * Топ поисковые фразы, по которым приходили на сайт за последние N дней.
 * Возвращает [] если переменные YANDEX_METRIKA_TOKEN / YANDEX_METRIKA_COUNTER_ID не заданы —
 * деплой безопасен до их добавления в Vercel.
 */
export async function getTopSearchQueries(days = 14, limit = 50): Promise<SearchQuery[]> {
  const token = process.env.YANDEX_METRIKA_TOKEN;
  const counterId = process.env.YANDEX_METRIKA_COUNTER_ID;

  if (!token || !counterId) {
    console.log("[metrika] Нет токена или counterId — дайджест пропускает Метрику");
    return [];
  }

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // preset=sources_search_phrases даёт dimension "phrase" только для фраз из Яндекс.Директа+organic;
  // для полноты берём также визиты по каждой фразе
  const url =
    `https://api-metrika.yandex.net/stat/v1/data?preset=sources_search_phrases` +
    `&id=${counterId}&date1=${startDate}&date2=${endDate}` +
    `&metrics=ym:s:visits&dimensions=ym:s:searchPhrase&limit=${limit}` +
    `&sort=-ym:s:visits`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `OAuth ${token}` },
      // Метрика API иногда отдаёт самоподписанный цепочку для старых клиентов — оставляем дефолтную проверку
    });

    if (!res.ok) {
      console.error("[metrika] Ошибка API:", res.status, (await res.text()).slice(0, 300));
      return [];
    }

    const data = await res.json();
    const queries: SearchQuery[] = (data.data || [])
      .map((row: any) => ({
        phrase: String(row.dimensions?.[0]?.name ?? "").trim(),
        visits: Number(row.metrics?.[0] ?? 0),
      }))
      .filter((q: SearchQuery) => q.phrase && !q.phrase.startsWith("ym:") && q.visits > 0);

    console.log("[metrika] Получено запросов:", queries.length);
    return queries;
  } catch (e) {
    console.error("[metrika] Exception:", e);
    return [];
  }
}
