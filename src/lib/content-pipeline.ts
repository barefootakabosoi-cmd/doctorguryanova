// src/lib/content-pipeline.ts
// Pipeline: PubMed → GigaChat → готовый контент

import { getPubMedArticles, type PubMedArticle } from "./pubmed";\nimport { searchCrossRef, type CrossRefArticle } from "./crossref";
import { chatCompletion } from "./gigachat";
import { getClusterByKeyword, type KeywordCluster } from "./seo-keywords";
import type { BlogPost } from "./blog-data";

export interface GeneratedContent {
  post: BlogPost;
  telegramPost: string;
  seo: { title: string; description: string; keywords: string };
  sources: PubMedArticle[];
}

// Конвертер Markdown → HTML
function markdownToHtml(md: string): string {
  let html = md;
  // Если уже HTML — возвращаем как есть
  if (html.includes("<h2>") || html.includes("<p>")) return html;
  
  // Заголовки
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  
  // Bold/Italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  
  // Списки
  const lines = html.split("\n");
  let inList = false;
  const result: string[] = [];
  for (const line of lines) {
    if (line.match(/^<li>/) || line.match(/^[-*] /)) {
      const content = line.replace(/^[-*] /, "").replace(/^<li>/, "").replace(/<\/li>$/, "");
      if (!inList) { result.push("<ul>"); inList = true; }
      result.push(`<li>${content}</li>`);
    } else {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(line);
    }
  }
  if (inList) result.push("</ul>");
  html = result.join("\n");
  
  // Параграфы
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("<h") || trimmed.startsWith("<ul>") || trimmed.startsWith("<li>")) return trimmed;
    return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
  }).filter(Boolean).join("\n");
  
  return html;
}

// Дедупликация статей по заголовку
function dedupeArticles(articles: PubMedArticle[]): PubMedArticle[] {
  const seen = new Set<string>();
  return articles.filter(a => {
    const key = a.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Расчёт времени чтения
function calculateReadTime(content: string): number {
  const text = content.replace(/<[^>]+>/g, "").replace(/[#*\-]/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 200));
}

// Слаг из заголовка
function slugify(text: string): string {
  const transliterate = (str: string) => {
    const map: Record<string, string> = {
      а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
    };
    return str.toLowerCase().replace(/[а-яё]/g, (char) => map[char] || char);
  };
  return transliterate(text)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 80);
}

export async function generateArticle(topic: string, cluster?: KeywordCluster): Promise<GeneratedContent> {
  console.log(`[pipeline] Тема: ${topic}`);
  
  // 1. PubMed
  const pubmedQuery = cluster?.pubmedQuery || topic;
  const rawArticles = await getPubMedArticles(pubmedQuery, 8);
  const articles = dedupeArticles(rawArticles).slice(0, 5);
  console.log(`[pipeline] PubMed: ${articles.length} уникальных статей`);
  
  // 2. GigaChat — статья от врача
  const abstractsText = allArticles.length > 0
    ? articles.map((a, i) => `--- Источник ${i + 1} (PMID: ${a.pmid}) ---\nЗаголовок: ${a.title}\nЖурнал: ${a.journal}, ${a.pubDate}\nAbstract: ${a.abstract}`).join("\n\n")
    : "Научные статьи не найдены. Пиши на основе клинического опыта и общепринятых медицинских знаний.";
  
  const systemPrompt = `Ты — врач-невролог Гурьянова Валентина Андреевна, выпускница 1-го МГМУ им. Сеченова (1977), 49 лет клинической практики. Специализация: неврология, рефлексотерапия, гирудотерапия, остеопатия.

Ты пишешь статью для блога своего сайта. Читатели — пациенты и коллеги-врачи. Статья должна быть медицински точной, экспертной, без воды.

ЖЁСТКИЕ ПРАВИЛА:
- Пиши от первого лица как врач: "В моей клинической практике...", "Я наблюдаю..."
- НЕТ рекламным оборотам: "избавьтесь", "сделайте первый шаг", "уникальный метод", "чудо-терапия"
- НЕТ кликбейту и преувеличениям
- НЕТ псевдонауке: не упоминай "энергетические меридианы", "очищение организма" без научного обоснования
- Опирайся ТОЛЬКО на предоставленные abstract'ы PubMed — НЕ выдумывай исследования
- Если данных мало — честно пиши "данных недостаточно" или "требуются дальнейшие исследования"
- Указывай доказательную базу: "Согласно исследованию [PMID: ...]", "В рандомизированном исследовании..."

СТРУКТУРА:
1. Введение — что это за состояние/метод, распространённость
2. Этиология и патогенез — с научных позиций
3. Клинические проявления — конкретные симптомы
4. Диагностика — что обследовать, дифференциальный диагноз
5. Методы лечения — консервативные + рефлексотерапия/гирудотерапия с указанием доказательной базы
6. Показания и противопоказания — честно
7. Практические рекомендации
8. Заключение — когда обращаться к врачу

ФОРМАТ: HTML. Используй <h2>, <p>, <ul>, <li>, <strong>. НЕ используй Markdown (##, **, -).
В конце — дисклеймер: информация не заменяет консультацию врача.`;
  
  const userPrompt = `Тема: ${topic}

Научные источники (abstract'ы из PubMed):
 ${abstractsText}

Напиши профессиональную медицинскую статью. Объём: 2000-3000 слов.`;
  
  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 5000,
  });
  
  let content = result.choices[0]?.message?.content ?? "";
  // Конвертируем Markdown в HTML, если GigaChat всё-таки использовал Markdown
  if (!content.includes("<h2>") && !content.includes("<p>")) {
    content = markdownToHtml(content);
  }
  console.log(`[pipeline] Статья: ${content.length} символов`);
  
  // 3. GigaChat — title, excerpt, keywords (без кликбейта)
  const metaResult = await chatCompletion({
    messages: [
      { role: "system", content: "Ты — медицинский редактор. Создавай профессиональные, НЕ рекламные заголовки." },
      { role: "user", content: `Для медицинской статьи на тему "${topic}" создай:
1. Title (50-70 символов, профессиональный, с ключевым словом, БЕЗ кликбейта)
2. Meta description (150-170 символов, информативный, с указанием что разбирается в статье)
3. 5-7 ключевых слов через запятую

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
  const excerpt = descMatch?.[1]?.trim() || `Профессиональный разбор темы: ${topic.toLowerCase()}`;
  const keywords = kwMatch?.[1]?.split(/[,;]/).map((k: string) => k.trim()).filter(Boolean).slice(0, 7) || [topic];
  
  // 4. GigaChat — Telegram-пост (экспертный, не рекламный)
  const tgResult = await chatCompletion({
    messages: [
      { role: "system", content: "Ты — врач, ведёшь профессиональный Telegram-канал. Тон экспертный, НЕ рекламный." },
      { role: "user", content: `Напиши пост для Telegram (800-1200 символов) на основе статьи. Тема: ${topic}

Правила:
- Экспертный тон, как врач для коллег и пациентов
- НЕТ кликбейту, "избавьтесь", "чудо"
- Кратко: о чём тема, что показывают исследования, практический вывод
- В конце: ссылка на полную статью + запись на консультацию (ненавязчиво)

Статья: ${content.slice(0, 3000)}` },
    ],
    temperature: 0.4,
    max_tokens: 1500,
  });
  
  const telegramPost = tgResult.choices[0]?.message?.content ?? "";
  
  // 5. Собираем BlogPost
  const slug = slugify(title);
  const now = new Date().toISOString().split("T")[0];
  
  const post: BlogPost = {
    slug,
    title,
    excerpt,
    content: content + generateSourcesBlock(articles),
    keywords,
    type: allArticles.length > 0 ? "research" : "seo",
    publishedAt: now,
    updatedAt: now,
    readTime: calculateReadTime(content),
  };
  
  return { post, telegramPost, seo: { title, description: excerpt, keywords: keywords.join(", ") }, sources: allArticles };
}

function generateSourcesBlock(articles: PubMedArticle[]): string {
  if (allArticles.length === 0) return "";
  const sources = allArticles.map(a => 
    `<li><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a> — ${a.journal}, ${a.pubDate}</li>`
  ).join("");
  return `\n<h2>Источники</h2>\n<ul>${sources}</ul>`;
}

export async function generateArticleByKeyword(keyword: string): Promise<GeneratedContent> {
  const cluster = getClusterByKeyword(keyword);
  return generateArticle(keyword, cluster);
}
