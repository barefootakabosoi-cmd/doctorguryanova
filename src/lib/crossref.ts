// src/lib/crossref.ts
// Поиск научных статей через Crossref API

export interface CrossRefArticle {
  doi: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  pubDate: string;
  url: string;
}

export async function searchCrossRef(query: string, maxResults: number = 5): Promise<CrossRefArticle[]> {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${maxResults}&select=DOI,title,abstract,author,published-print,published-online,container-title`;
    const res = await fetch(url, {
      headers: { "User-Agent": "doctorguryanova.ru/1.0 (mailto:info@doctorguryanova.ru)" },
    });
    if (!res.ok) {
      console.error(`CrossRef error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    const items = data.message?.items || [];
    
    return items
      .filter((item: any) => item.title && item.title[0]) // Отсекаем статьи без названия
      .map((item: any) => {
        // Декодируем базовые HTML-сущности, которые отдаёт Crossref
        const decodeHtml = (str: string) => str
          .replace(/&amp;amp;/g, '&')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"');
          
        return {
          doi: item.DOI ? decodeHtml(item.DOI) : "",
          title: decodeHtml(item.title[0]),
          abstract: item.abstract ? decodeHtml(item.abstract) : "",
          authors: (item.author || []).slice(0, 5).map((a: any) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean),
          journal: (item["container-title"] && item["container-title"][0]) ? decodeHtml(item["container-title"][0]) : "",
          pubDate: (item["published-print"]?.["date-parts"]?.[0] || item["published-online"]?.["date-parts"]?.[0] || []).join("-"),
          url: item.DOI ? `https://doi.org/${item.DOI}` : "",
        };
      });
  } catch (error) {
    console.error("CrossRef error:", error);
    return [];
  }
}
