import { getPubMedArticles } from "./pubmed";
import { searchCrossRef } from "./crossref";
import { chatCompletion } from "./gigachat";
import { getClusterByKeyword, getRandomCluster, type KeywordCluster } from "./seo-keywords";
import type { BlogPost } from "./blog-data";
import type { ResearchDossier, EvidenceItem, GeneratedContent } from "./research-dossier";
import sanitizeHtml from "sanitize-html";

function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "blockquote"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    transformTags: {
      "a": sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" })
    }
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

// SCIENCE GATE: Оценка релевантности и достаточности источников
async function evaluateEvidence(topic: string, articles: EvidenceItem[]): Promise<{ isSufficient: boolean; dossier?: ResearchDossier }> {
  if (articles.length === 0) return { isSufficient: false };

  const prompt = `Ты — строгий медицинский рецензент. Оцени источники для темы: "${topic}".
Источники:
 ${articles.map((a, i) => `${i+1}. ${a.title} (${a.journal}, ${a.pubDate}). Abstract: ${a.abstract}`).join("\n\n")}

Сформируй JSON:
{
  "isSufficient": boolean, // true только если есть хотя бы 1 релевантный RCT, мета-анализ или крупное когортное исследование
  "dossier": {
    "chosenAngle": "Уточненная тема на основе источников",
    "keyFacts": ["Факт 1 из источника", "Факт 2"],
    "whatIsKnown": ["Что известно"],
    "whatIsNotKnown": ["Чего мы не знаем"],
    "limitations": ["Ограничения исследований"],
    "safeClaims": ["Безопасные выводы для пациентов"],
    "confidence": "high | medium | low"
  }
}
Если источники нерелевантны или это только клинические случаи (n=1) — isSufficient: false.`;

  try {
    const result = await chatCompletion({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
    });

    let rawText = result.choices[0]?.message?.content ?? "{}";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) rawText = jsonMatch[0];

    const parsed = JSON.parse(rawText);
    if (parsed.isSufficient && parsed.dossier) {
      const dossier: ResearchDossier = {
        topic,
        ...parsed.dossier,
        evidence: articles,
      };
      return { isSufficient: true, dossier };
    }
  } catch (e) {
    console.error("[ScienceGate] Parse error:", e);
  }

  return { isSufficient: false };
}

// VOICE LAYER: Генерация статьи и TG-поста на основе Dossier
async function generateVersions(dossier: ResearchDossier): Promise<{ siteTitle: string; siteExcerpt: string; siteContent: string; telegramTitle: string; telegramPost: string }> {
  const prompt = `Ты — медицинский редактор. Напиши материал на основе строго утверждённого Dossier.
Тема: ${dossier.chosenAngle}
Факты: ${dossier.keyFacts.join("; ")}
Известно: ${dossier.whatIsKnown.join("; ")}
Ограничения: ${dossier.limitations.join("; ")}
Безопасные выводы: ${dossier.safeClaims.join("; ")}

ЗАПРЕЩЕНО выдумывать новые факты, цифры или дозировки.
Сгенерируй JSON:
{
  "siteTitle": "Заголовок для сайта",
  "siteExcerpt": "Описание",
  "siteContent": "<h2>Введение</h2><p>...</p><h2>Что показало исследование</h2>...",
  "telegramTitle": "Заголовок для TG",
  "telegramPost": "Короткий пост для TG"
}`;

  const result = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 3000,
  });

  let rawText = result.choices[0]?.message?.content ?? "{}";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (jsonMatch) rawText = jsonMatch[0];

  try {
    return JSON.parse(rawText);
  } catch (e) {
    return { siteTitle: dossier.chosenAngle, siteExcerpt: "Описание", siteContent: rawText, telegramTitle: dossier.chosenAngle, telegramPost: "Подробнее на сайте" };
  }
}

// MAIN PIPELINE с Adaptive Topic Selection
export async function generateArticle(topic: string, cluster?: KeywordCluster): Promise<GeneratedContent> {
  const maxAttempts = 3;
  let currentTopic = topic;
  let currentCluster = cluster;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`[Pipeline] Attempt ${attempt + 1}: ${currentTopic}`);

    const pubmedQuery = currentCluster?.pubmedQuery || currentTopic;
    const rawPubmed = await getPubMedArticles(pubmedQuery, 5);
    const crossrefArticles = await searchCrossRef(pubmedQuery, 3);
    const allArticles = [...rawPubmed, ...crossrefArticles].slice(0, 7) as EvidenceItem[];

    if (allArticles.length === 0) {
      console.log("[Pipeline] No articles found. Trying new topic.");
      currentCluster = getRandomCluster();
      currentTopic = currentCluster.primary;
      continue;
    }

    // SCIENCE GATE
    const { isSufficient, dossier } = await evaluateEvidence(currentTopic, allArticles);

    if (!isSufficient || !dossier) {
      console.log("[Pipeline] Insufficient evidence. Changing angle/topic.");
      // Меняем угол: берем другой кластер
      currentCluster = getRandomCluster();
      currentTopic = currentCluster.primary;
      continue;
    }

    // Если доказательств достаточно — генерируем версии
    const versions = await generateVersions(dossier);

    const siteContent = sanitizeContent(versions.siteContent || "");
    const slug = slugify(versions.siteTitle || currentTopic);
    const now = new Date().toISOString().split("T")[0];

    const post: BlogPost = {
      slug,
      title: versions.siteTitle || currentTopic,
      excerpt: versions.siteExcerpt || `Профессиональный разбор: ${currentTopic}`,
      content: siteContent + generateSourcesBlock(allArticles),
      keywords: currentCluster ? [currentCluster.primary] : [currentTopic],
      type: "research",
      publishedAt: now,
      updatedAt: now,
      readTime: calculateReadTime(siteContent),
    };

    return {
      post,
      telegramPost: sanitizeHtml(versions.telegramPost || "", { allowedTags: [], allowedAttributes: {} }),
      seo: { title: post.title, description: post.excerpt, keywords: post.keywords.join(", ") },
      dossier,
      sources: allArticles
    };
  }

  // Если за 3 попытки не нашли тему — возвращаем пустой результат (cron не упадёт)
  console.log("[Pipeline] Failed to find sufficient evidence after max attempts.");
  const emptyPost: BlogPost = {
    slug: "no-topic-found-" + Date.now(),
    title: "Не удалось найти достаточно данных для статьи",
    excerpt: "",
    content: "<p>Система не нашла достаточно научных доказательств для генерации статьи.</p>",
    keywords: [],
    type: "seo",
    publishedAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0],
    readTime: 1,
  };

  return {
    post: emptyPost,
    telegramPost: "Не удалось найти достаточно данных для статьи сегодня.",
    seo: { title: "Нет данных", description: "", keywords: "" },
    dossier: { topic: "", chosenAngle: "", evidence: [], keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [], safeClaims: [], confidence: "low" },
    sources: []
  };
}

function generateSourcesBlock(articles: EvidenceItem[]): string {
  if (articles.length === 0) return "";
  const sources = articles.map(a => `<li><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a> — ${a.journal}, ${a.pubDate}</li>`).join("");
  return `\n<h2>Источники</h2>\n<ul>${sources}</ul>`;
}

export async function generateArticleByKeyword(keyword: string): Promise<GeneratedContent> {
  const cluster = getClusterByKeyword(keyword);
  return generateArticle(keyword, cluster);
}
