// src/lib/metrika.ts
// Получение поисковых запросов из Яндекс.Метрики

export async function getTopSearchQueries(): Promise<string[]> {
  const token = process.env.YANDEX_METRIKA_TOKEN;
  const counterId = process.env.YANDEX_METRIKA_COUNTER_ID;
  
  if (!token || !counterId) {
    console.log("[metrika] Нет токена или counterId");
    return [];
  }

  // Дата 14 дней назад
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const url = `https://api-metrika.yandex.net/stat/v1/data?preset=sources_search_phrases&id=${counterId}&date1=${startDate}&date2=${endDate}&metrics=visits&dimensions=phrase&limit=20`;

  try {
    const res = await fetch(url, {
      headers: { "Authorization": `OAuth ${token}` }
    });
    
    if (!res.ok) {
      console.error("[metrika] Ошибка API:", res.status, await res.text());
      return [];
    }
    
    const data = await res.json();
    const queries = data.data?.map((item: any) => item.dimensions?.[0]?.name).filter(Boolean) || [];
    console.log("[metrika] Получено запросов:", queries.length);
    return queries;
  } catch (e) {
    console.error("[metrika] Exception:", e);
    return [];
  }
}
