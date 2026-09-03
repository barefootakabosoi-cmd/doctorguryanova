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

export type GenerationResult = 
  | { status: "success"; content: GeneratedContent }
  | { status: "no_suitable_topic" };

// SCIENCE GATE: Оценка релевантности и достаточности источников
async function evaluateEvidence(topic: string, articles: EvidenceItem[]): Promise<{ isSufficient: boolean; dossier?: ResearchDossier; reason?: string }> {
  if (articles.length === 0) return { isSufficient: false, reason: "no sources found" };

  const prompt = `Ты — строгий медицинский рецензент. Оцени источники для темы: "${topic}".
Источники:
 ${articles.map((a, i) => `${i+1}. ${a.title} (${a.journal}, ${a.pubDate}). Abstract: ${a.abstract}`).join("\n\n")}

Сформируй JSON:
{
  "interventionMatches": boolean, // true, ТОЛЬКО если вмешательство в источнике совпадает с темой.
  "relevantSources": number,
  "highQuality": number, // RCT, meta-analysis, systematic review, guideline
  "mediumQuality": number, // Когортные, обсервационные, обзоры (reviews)
  "clinicalCases": number,
  "isSufficient": boolean, // СТРОГО: true, если (highQuality >= 1) ИЛИ (mediumQuality >= 2 И clinicalCases == 0).
  "reason": "Краткое объяснение решения",
  "dossier": {
    "chosenAngle": "Уточненная тема",
    "keyFacts": ["Факты"],
    "whatIsKnown": ["Известно"],
    "whatIsNotKnown": ["Неизвестно"],
    "limitations": ["Ограничения"],
    "safeClaims": ["Выводы"],
    "confidence": "high | medium | low"
  }
}`;

  try {
    const result = await chatCompletion({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
    });
    
    let rawText = result.choices[0]?.message?.content ?? "{}";
    console.log("[ScienceGate] GigaChat raw response:", rawText);
    
    // Извлекаем JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) rawText = jsonMatch[0];
    
    // Авто-ремонт JSON: одинарные кавычки -> двойные, убираем trailing commas
    rawText = rawText.replace(/'/g, '"').replace(/,\s*([\]}])/g, '$1');
    
    const parsed = JSON.parse(rawText);
    
    // Структурированный лог
    console.log(`[ScienceGate] 
      topic: ${topic}
      sources: ${articles.length}
      relevant: ${parsed.relevantSources || 0}
      highQuality: ${parsed.highQuality || 0}
      mediumQuality: ${parsed.mediumQuality || 0}
      clinicalCases: ${parsed.clinicalCases || 0}
      interventionMatches: ${parsed.interventionMatches}
      decision: ${parsed.isSufficient ? 'PASS' : 'PIVOT'}
      reason: ${parsed.reason || 'unknown'}
    `);

    // Серверная математика (не доверяем GigaChat)
    const isMathSufficient = (parsed.highQuality >= 1) || (parsed.mediumQuality >= 2 && parsed.clinicalCases === 0);
    const finalIsSufficient = isMathSufficient && parsed.interventionMatches;

    if (finalIsSufficient && parsed.dossier) {
      const dossier: ResearchDossier = {
        topic,
        ...parsed.dossier,
        evidence: articles,
      };
      return { isSufficient: true, dossier };
    } else {
      return { isSufficient: false, reason: parsed.reason || "insufficient evidence or intervention mismatch" };
    }
  } catch (e) {
    console.error("[ScienceGate] Error:", e);
    return { isSufficient: false, reason: "evaluation error" };
  }
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
  console.log("[VoiceLayer] GigaChat raw response:", rawText);
  
  // Извлекаем JSON
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (jsonMatch) rawText = jsonMatch[0];
  
  // Авто-ремонт JSON: одинарные кавычки -> двойные, убираем trailing commas
  rawText = rawText.replace(/'/g, '"').replace(/,\s*([\]}])/g, '$1');
  
  try {
    return JSON.parse(rawText);
  } catch (e) {
    console.error("[VoiceLayer] JSON parse failed, fallback to raw text");
    return { siteTitle: dossier.chosenAngle, siteExcerpt: "Описание", siteContent: rawText, telegramTitle: dossier.chosenAngle, telegramPost: "Подробнее на сайте" };
  }
}

// MAIN PIPELINE с Adaptive Topic Selection
export async function generateArticle(topic: string, cluster?: KeywordCluster): Promise<GenerationResult> {
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
    const { isSufficient, dossier, reason } = await evaluateEvidence(currentTopic, allArticles);

    if (!isSufficient || !dossier) {
      console.log(`[Pipeline] PIVOT. Reason: ${reason}. Changing angle/topic.`);
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
      status: "success",
      content: {
        post,
        telegramPost: sanitizeHtml(versions.telegramPost || "", { allowedTags: [], allowedAttributes: {} }),
        seo: { title: post.title, description: post.excerpt, keywords: post.keywords.join(", ") },
        dossier,
        sources: allArticles
      }
    };
  }

  // Если за 3 попытки не нашли тему — возвращаем технический статус без создания BlogPost
  console.log("[Pipeline] Failed to find sufficient evidence after max attempts. No draft created.");
  return { status: "no_suitable_topic" };
}

function generateSourcesBlock(articles: EvidenceItem[]): string {
  if (articles.length === 0) return "";
  const sources = articles.map(a => `<li><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a> — ${a.journal}, ${a.pubDate}</li>`).join("");
  return `\n<h2>Источники</h2>\n<ul>${sources}</ul>`;
}

export async function generateArticleByKeyword(keyword: string): Promise<GenerationResult> {
  const cluster = getClusterByKeyword(keyword);
  return generateArticle(keyword, cluster);
}
