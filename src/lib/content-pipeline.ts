import { getPubMedArticles, type PubMedArticle } from "./pubmed";
import { searchCrossRef, type CrossRefArticle } from "./crossref";
import { chatCompletion } from "./gigachat";
import { getClusterByKeyword, type KeywordCluster } from "./seo-keywords";
import type { BlogPost } from "./blog-data";

export interface GeneratedContent {
  post: BlogPost;
  telegramPost: string;
  seo: { title: string; description: string; keywords: string };
  sources: (PubMedArticle | CrossRefArticle)[];
}

function markdownToHtml(md: string): string {
  let html = md;
  if (html.includes("<h2>") || html.includes("<p>")) return html;
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  const lines = html.split("\n");
  let inList = false;
  const result: string[] = [];
  for (const line of lines) {
    if (line.match(/^[-*] /)) {
      const content = line.replace(/^[-*] /, "");
      if (!inList) { result.push("<ul>"); inList = true; }
      result.push(`<li>${content}</li>`);
    } else {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(line);
    }
  }
  if (inList) result.push("</ul>");
  html = result.join("\n");
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("<h") || trimmed.startsWith("<ul>") || trimmed.startsWith("<li>")) return trimmed;
    return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
  }).filter(Boolean).join("\n");
  return html;
}

function stripEmoji(text: string): string {
  return text.split("").filter(char => {
    const code = char.codePointAt(0);
    if (code === undefined) return true;
    if (code >= 0x1F000 && code <= 0x1FFFF) return false;
    if (code >= 0x2600 && code <= 0x27BF) return false;
    if (code >= 0x2190 && code <= 0x21FF) return false;
    if (code >= 0x2B00 && code <= 0x2BFF) return false;
    return true;
  }).join("");
}

function dedupeArticles(articles: (PubMedArticle | CrossRefArticle)[]): (PubMedArticle | CrossRefArticle)[] {
  const seen = new Set<string>();
  return articles.filter(a => {
    const key = a.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calculateReadTime(content: string): number {
  const text = content.replace(/<[^>]+>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 200));
}

function slugify(text: string): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };
  return text.toLowerCase()
    .replace(/[а-яё]/g, (c) => map[c] || c)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 80);
}

export async function generateArticle(topic: string, cluster?: KeywordCluster): Promise<GeneratedContent> {
  console.log("[pipeline] Тема:", topic);

  const pubmedQuery = cluster?.pubmedQuery || topic;
  const rawPubmed = await getPubMedArticles(pubmedQuery, 5);
  const crossrefArticles = await searchCrossRef(pubmedQuery, 3);
  const allArticles = dedupeArticles([...rawPubmed, ...crossrefArticles]).slice(0, 5);

  const abstractsText = allArticles.length > 0
    ? allArticles.map((a, i) => `--- Источник ${i + 1} ---\nЗаголовок: ${a.title}\nЖурнал: ${a.journal}, ${a.pubDate}\nAbstract: ${a.abstract}`).join("\n\n")
    : "Научные статьи не найдены. Пиши на основе клинического опыта.";

  const systemPrompt = `Ты — врач-невролог Гурьянова Валентина Андреевна, выпускница 1-го МГМУ им. Сеченова (1977), 49 лет клинической практики. Специализация: неврология, рефлексотерапия, гирудотерапия, остеопатия.

Ты пишешь медицинскую статью для блога. Читатели — пациенты и коллеги-врачи. Тон — профессиональный, экспертный.

КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ рекламные обороты:
- "запишитесь на консультацию"
- "бесплатная консультация"
- "прямо сейчас"
- "не упускайте"
- "сделайте первый шаг"
- "избавьтесь от"
- "чудо-терапия", "чудо-метод"
- "уникальный метод"
- "не откладывайте"
- "верните здоровье"

Пиши как врач в медицинском журнале, не как маркетолог.

ЗАПРЕЩЕНО: эмодзи, спецсимволы (→, ✓, ★), псевдонаука ("энергетические меридианы").

Разрешено: от первого лица ("В клинической практике..."), ссылки на исследования ("Согласно исследованию...").

СТРУКТУРА:
1. Введение
2. Этиология и патогенез
3. Клинические проявления
4. Диагностика
5. Методы лечения (с доказательной базой)
6. Показания и противопоказания
7. Практические рекомендации
8. Заключение (без рекламных призывов)

ФОРМАТ: HTML (<h2>, <p>, <ul>, <li>, <strong>). НЕ Markdown. НЕ эмодзи.
Дисклеймер: "Информация носит образовательный характер и не заменяет консультацию врача."`;

  const userPrompt = `Тема: ${topic}\n\nНаучные источники:\n${abstractsText}\n\nНапиши профессиональную медицинскую статью. 2000-3000 слов. БЕЗ рекламы. БЕЗ эмодзи.`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 4000,
  });

  let content = result.choices[0]?.message?.content ?? "";
  if (!content.includes("<h2>") && !content.includes("<p>")) {
    content = markdownToHtml(content);
  }
  content = stripEmoji(content);

  const metaResult = await chatCompletion({
    messages: [
      { role: "system", content: "Ты — медицинский редактор. Профессиональные заголовки, НЕ рекламные, НЕ кликбейт." },
      { role: "user", content: `Для статьи "${topic}" создай:
TITLE (50-70 символов, профессиональный)
DESCRIPTION (150-170 символов, информативный)
KEYWORDS (5-7 через запятую)

Формат:
TITLE: ...
DESCRIPTION: ...
KEYWORDS: ...` },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const metaText = metaResult.choices[0]?.message?.content ?? "";
  const titleMatch = metaText.match(/TITLE:\s*(.+)/i);
  const descMatch = metaText.match(/DESCRIPTION:\s*(.+)/i);
  const kwMatch = metaText.match(/KEYWORDS:\s*(.+)/i);

  const title = titleMatch?.[1]?.trim() || topic;
  const excerpt = descMatch?.[1]?.trim() || `Профессиональный разбор: ${topic}`;
  const keywords = kwMatch?.[1]?.split(/[,;]/).map((k: string) => k.trim()).filter(Boolean).slice(0, 7) || [topic];

  const tgResult = await chatCompletion({
    messages: [
      { role: "system", content: "Ты — врач, ведёшь профессиональный Telegram-канал. Экспертный тон. БЕЗ рекламы. БЕЗ эмодзи. БЕЗ 'запишитесь', 'бесплатная', 'прямо сейчас'." },
      { role: "user", content: `Напиши пост для Telegram (800-1200 символов). Тема: ${topic}

Экспертный тон. Кратко: о чём тема, что показывают исследования, практический вывод.
В конце: "Подробнее на сайте" и ссылка — ненавязчиво.

Статья: ${content.slice(0, 3000)}` },
    ],
    temperature: 0.4,
    max_tokens: 1500,
  });

  const telegramPost = stripEmoji(tgResult.choices[0]?.message?.content ?? "");

  const slug = slugify(title);
  const now = new Date().toISOString().split("T")[0];

  const post: BlogPost = {
    slug,
    title,
    excerpt,
    content: content + generateSourcesBlock(allArticles),
    keywords,
    type: allArticles.length > 0 ? "research" : "seo",
    publishedAt: now,
    updatedAt: now,
    readTime: calculateReadTime(content),
  };

  return { post, telegramPost, seo: { title, description: excerpt, keywords: keywords.join(", ") }, sources: allArticles };
}

function generateSourcesBlock(articles: (PubMedArticle | CrossRefArticle)[]): string {
  if (articles.length === 0) return "";
  const sources = articles.map(a =>
    `<li><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a> — ${a.journal}, ${a.pubDate}</li>`
  ).join("");
  return `\n<h2>Источники</h2>\n<ul>${sources}</ul>`;
}

export async function generateArticleByKeyword(keyword: string): Promise<GeneratedContent> {
  const cluster = getClusterByKeyword(keyword);
  return generateArticle(keyword, cluster);
}
