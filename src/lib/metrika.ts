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
export interface MetrikaResult {
  queries: SearchQuery[];
  /** Строка диагностики, если данные получить не удалось. */
  problem?: string;
}

/**
 * Детальная версия: различает «не настроено», «API ответил ошибкой» и «данных нет».
 * Нужна, чтобы на проде сразу видеть точную причину пустого дайджеста.
 */
export async function fetchSearchQueries(days = 14, limit = 50): Promise<MetrikaResult> {
  const token = process.env.YANDEX_METRIKA_TOKEN;
  const counterId = process.env.YANDEX_METRIKA_COUNTER_ID;

  if (!token || !counterId) {
    return { queries: [], problem: "not-configured: задай YANDEX_METRIKA_TOKEN и YANDEX_METRIKA_COUNTER_ID в Vercel" };
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
      const body = (await res.text()).slice(0, 300);
      console.error("[metrika] Ошибка API:", res.status, body);
      let hint = "";
      if (res.status === 401) hint = " (токен невалиден/просрочен — выпусти новый)";
      if (res.status === 403) hint = " (нет доступа к счётчику — токен от другого аккаунта?)";
      if (res.status === 400) hint = " (проверь YANDEX_METRIKA_COUNTER_ID)";
      return { queries: [], problem: `metrika-api ${res.status}${hint}: ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    const queries: SearchQuery[] = (data.data || [])
      .map((row: any) => ({
        phrase: String(row.dimensions?.[0]?.name ?? "").trim(),
        visits: Number(row.metrics?.[0] ?? 0),
      }))
      .filter((q: SearchQuery) => q.phrase && !q.phrase.startsWith("ym:") && q.visits > 0);

    console.log("[metrika] Получено запросов:", queries.length);
    if (queries.length === 0) {
      return { queries, problem: "empty: API ответил успешно, но поисчных фраз пока нет (мало трафика или счётчик установлен недавно)" };
    }
    return { queries };
  } catch (e: any) {
    console.error("[metrika] Exception:", e?.message || e);
    return { queries: [], problem: `network-error: ${String(e?.message || e).slice(0, 200)} (с Vercel API Метрики доступен; сетевые проблемы тут не ожидаются)` };
  }
}

/** Обратная совместимость: только список фраз, без диагностики. */
export async function getTopSearchQueries(days = 14, limit = 50): Promise<SearchQuery[]> {
  const r = await fetchSearchQueries(days, limit);
  return r.queries;
}
