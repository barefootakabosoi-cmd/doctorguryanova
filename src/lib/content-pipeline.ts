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
    ? allArticles.map((a, i) => `Источник ${i + 1}: ${a.title} (${a.journal}). Abstract: ${a.abstract}`).join("\n")
    : "Научные статьи не найдены. Пиши на основе клинического опыта.";

  // ЕДИНСТВЕННЫЙ ЗАПРОС К GIGACHAT
  const systemPrompt = `Ты — врач-невролог Гурьянова Валентина Андреевна. Пиши статью для блога. Тон: профессиональный, без рекламы ("запишитесь", "чудо"), без эмодзи. Формат: HTML (<h2>, <p>, <ul>, <li>).`;

  const userPrompt = `Тема: ${topic}\nИсточники:\n${abstractsText}\n\nСгенерируй ответ строго в формате JSON:\n{\n  "title": "Заголовок (50-70 символов)",\n  "excerpt": "Описание (150 символов)",\n  "keywords": ["ключ1", "ключ2"],\n  "content": "<h2>Введение</h2><p>Текст статьи...</p>",\n  "telegramPost": "Короткий пост для Telegram"\n}`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 3000, // Немного уменьшили для скорости
  });

  let rawText = result.choices[0]?.message?.content ?? "";

  // Чистим от возможных markdown обёрток
  rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    console.error("[pipeline] JSON parse failed, fallback");
    parsed = { title: topic, excerpt: "Описание", keywords: [topic], content: rawText, telegramPost: "" };
  }

  const title = stripEmoji(parsed.title || topic);
  const excerpt = stripEmoji(parsed.excerpt || `Статья о ${topic}`);
  const keywords = (parsed.keywords || [topic]).map((k: string) => stripEmoji(k));
  let content = stripEmoji(parsed.content || "");
  const telegramPost = stripEmoji(parsed.telegramPost || "");

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
  const sources = articles.map(a => `<li><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a></li>`).join("");
  return `<h2>Источники</h2><ul>${sources}</ul>`;
}

export async function generateArticleByKeyword(keyword: string): Promise<GeneratedContent> {
  const cluster = getClusterByKeyword(keyword);
  return generateArticle(keyword, cluster);
}
