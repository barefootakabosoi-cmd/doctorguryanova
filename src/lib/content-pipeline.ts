import { getPubMedArticles, type PubMedArticle } from "./pubmed";
import { searchCrossRef, type CrossRefArticle } from "./crossref";
import { chatCompletion } from "./gigachat";
import { getClusterByKeyword, type KeywordCluster } from "./seo-keywords";
import type { BlogPost } from "./blog-data";
import type { ResearchDossier, SourceArticle } from "./research-dossier";
import sanitizeHtml from "sanitize-html";

export interface GeneratedContent {
  post: BlogPost;
  telegramPost: string;
  seo: { title: string; description: string; keywords: string };
  dossier: ResearchDossier;
  sources: SourceArticle[];
}

function dedupeArticles(articles: SourceArticle[]): SourceArticle[] {
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

function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "blockquote"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    transformTags: {
      "a": sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" })
    }
  });
}

export async function generateArticle(topic: string, cluster?: KeywordCluster): Promise<GeneratedContent> {
  const pubmedQuery = cluster?.pubmedQuery || topic;
  const rawPubmed = await getPubMedArticles(pubmedQuery, 5);
  const crossrefArticles = await searchCrossRef(pubmedQuery, 3);

  const allArticles = dedupeArticles([...rawPubmed, ...crossrefArticles]).slice(0, 7) as SourceArticle[];

  const dossier: ResearchDossier = {
    topic,
    searchQuery: pubmedQuery,
    articles: allArticles,
    generatedAt: new Date().toISOString()
  };

  const dossierText = allArticles.length > 0
    ? allArticles.map((a, i) => `Источник ${i + 1}: ${a.title} (${a.journal}, ${a.pubDate}). PMID: ${a.pmid || "нет"}. DOI: ${a.doi || "нет"}.\nAbstract: ${a.abstract}`).join("\n\n")
    : "Научные статьи не найдены. Сформируй осторожный текст на основе общих медицинских знаний, явно указав, что конкретных исследований не найдено.";

  // 1. SCIENCE LAYER: Извлечение фактов
  const sciencePrompt = `Ты — медицинский аналитик. Изучи предоставленные научные источники по теме "${topic}". 
Извлеки строго подтверждённые фактами данные. ЗАПРЕЩЕНО выдумывать цифры, размеры выборок, PMID, DOI или результаты.
Если данных мало, честно напиши: "Недостаточно данных для уверенного утверждения".
Источники:\n${dossierText}`;

  const scienceResult = await chatCompletion({
    messages: [
      { role: "system", content: sciencePrompt },
      { role: "user", content: `Сформируй JSON с полями: facts (массив строк), summary (краткое резюме), limitations (ограничения исследования).` },
    ],
    temperature: 0.2,
    max_tokens: 1000,
  });

  const factualData = scienceResult.choices[0]?.message?.content ?? "{}";

  // 2. VOICE LAYER: Гуманизация и создание версий
  const voicePrompt = `Ты — медицинский редактор. На основе извлечённых фактов напиши материал для сайта и Telegram.
Тон: спокойный, уверенный, тёплый, профессиональный. Без клише ("в современном мире", "важно отметить").
ЗАПРЕЩЕНО менять медицинские факты, цифры или диагнозы из блока фактов.

Фактический блок:\n${factualData}`;

  const voiceResult = await chatCompletion({
    messages: [
      { role: "system", content: voicePrompt },
      { role: "user", content: `Сгенерируй ответ в формате JSON:
{
  "siteTitle": "Заголовок для сайта (SEO, до 70 символов)",
  "siteExcerpt": "Описание для сайта (до 170 символов)",
  "siteContent": "HTML-статья для сайта. Структура: <h2>Введение</h2><p>...</p><h2>Что показало исследование</h2>...",
  "telegramTitle": "Заголовок для Telegram-поста",
  "telegramPost": "Текст поста для Telegram (короткий, с призывом перейти на сайт)"
}` },
    ],
    temperature: 0.5,
    max_tokens: 3000,
  });

  let parsed: any;
  try {
    let rawText = voiceResult.choices[0]?.message?.content ?? "";
    // Железобетонный парсинг: вырезаем любой мусор вокруг JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found");
    }
  } catch (e) {
    console.error("[pipeline] JSON parse failed, fallback to raw text", e);
    // Если JSON не спарсился, используем весь текст как статью, чтобы не потерять данные
    const rawText = voiceResult.choices[0]?.message?.content ?? "";
    parsed = { 
      siteTitle: topic, 
      siteExcerpt: "Профессиональный разбор темы", 
      siteContent: rawText, 
      telegramTitle: topic,
      telegramPost: "Подробнее на сайте" 
    };
  }

  const siteContent = sanitizeContent(parsed.siteContent || "");
  const telegramPost = sanitizeHtml(parsed.telegramPost || "", { allowedTags: [], allowedAttributes: {} }); // Telegram не любит HTML

  const slug = slugify(parsed.siteTitle || topic);
  const now = new Date().toISOString().split("T")[0];

  const post: BlogPost = {
    slug,
    title: parsed.siteTitle || topic,
    excerpt: parsed.siteExcerpt || `Профессиональный разбор: ${topic}`,
    content: siteContent + generateSourcesBlock(allArticles),
    keywords: cluster ? [cluster.primary] : [topic],
    type: allArticles.length > 0 ? "research" : "seo",
    publishedAt: now,
    updatedAt: now,
    readTime: calculateReadTime(siteContent),
  };

  return { 
    post, 
    telegramPost, 
    seo: { title: post.title, description: post.excerpt, keywords: post.keywords.join(", ") },
    dossier,
    sources: allArticles 
  };
}

function generateSourcesBlock(articles: SourceArticle[]): string {
  if (articles.length === 0) return "";
  const sources = articles.map(a => `<li><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a> — ${a.journal}, ${a.pubDate}</li>`).join("");
  return `\n<h2>Источники</h2>\n<ul>${sources}</ul>`;
}

export async function generateArticleByKeyword(keyword: string): Promise<GeneratedContent> {
  const cluster = getClusterByKeyword(keyword);
  return generateArticle(keyword, cluster);
}
