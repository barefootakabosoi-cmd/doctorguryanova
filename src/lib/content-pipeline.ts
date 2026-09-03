import { getPubMedArticles } from "./pubmed";
import { searchCrossRef } from "./crossref";
import { chatCompletion } from "./gigachat";
import { getClusterByKeyword, getRandomCluster, type KeywordCluster } from "./seo-keywords";
import type { BlogPost } from "./blog-data";
import type { ResearchDossier, EvidenceItem, GeneratedContent } from "./research-dossier";
import sanitizeHtml from "sanitize-html";

// Очистка текста от битых символов кодировки (например, к��гнитивно)
function sanitizeBadEncoding(text: string): string {
  if (!text) return "";
  // Удаляем символ замены (U+FFFD) и другие нечитаемые символы
  return text.replace(/\uFFFD/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
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

// SCIENCE GATE
async function evaluateEvidence(topic: string, articles: EvidenceItem[]): Promise<{ isSufficient: boolean; dossier?: ResearchDossier; reason?: string }> {
  if (articles.length === 0) return { isSufficient: false, reason: "no sources found" };

  const prompt = `Ты — строгий медицинский рецензент. Оцени источники для темы: "${topic}".
Источники:
 ${articles.map((a, i) => `${i+1}. ${a.title} (${a.journal}, ${a.pubDate}). Abstract: ${a.abstract}`).join("\n\n")}

Сформируй JSON БЕЗ КОММЕНТАРИЕВ:
{
  "interventionMatches": boolean,
  "relevantSources": number,
  "highQuality": number,
  "mediumQuality": number,
  "clinicalCases": number,
  "isSufficient": boolean,
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
    
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) rawText = jsonMatch[0];
    
    // ЖЁСТКАЯ ОЧИСТКА JSON: вырезаем комментарии (// ...), меняем одинарные кавычки, убираем trailing commas, чиним Python Booleans
    rawText = rawText.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '') // comments
                     .replace(/'/g, '"') // single quotes
                     .replace(/,\s*([}\]])/g, '$1') // trailing commas
                     .replace(/\bTrue\b/g, 'true')
                     .replace(/\bFalse\b/g, 'false')
                     .replace(/\bNone\b/g, 'null');
    
    const parsed = JSON.parse(rawText);
    
    console.log(`[ScienceGate] topic: ${topic} | high: ${parsed.highQuality || 0} | med: ${parsed.mediumQuality || 0} | cases: ${parsed.clinicalCases || 0} | match: ${parsed.interventionMatches}`);

    // Серверная математика
    const isMathSufficient = (parsed.highQuality >= 1) || (parsed.mediumQuality >= 2 && parsed.clinicalCases === 0);
    const finalIsSufficient = isMathSufficient && parsed.interventionMatches;

    if (finalIsSufficient && parsed.dossier) {
      // Очищаем текстовые поля Dossier от HTML
      const cleanText = (str: string) => sanitizeHtml(str || "", { allowedTags: [], allowedAttributes: {} });
      const cleanArray = (arr: string[]) => arr ? arr.map(cleanText) : [];
      
      const dossier: ResearchDossier = {
        topic,
        chosenAngle: cleanText(parsed.dossier.chosenAngle),
        keyFacts: cleanArray(parsed.dossier.keyFacts),
        whatIsKnown: cleanArray(parsed.dossier.whatIsKnown),
        whatIsNotKnown: cleanArray(parsed.dossier.whatIsNotKnown),
        limitations: cleanArray(parsed.dossier.limitations),
        safeClaims: cleanArray(parsed.dossier.safeClaims),
        confidence: parsed.dossier.confidence,
        evidence: articles,
      };
      return { isSufficient: true, dossier };
    } else {
      return { isSufficient: false, reason: parsed.reason || "insufficient evidence" };
    }
  } catch (e) {
    console.error("[ScienceGate] Error:", e);
    return { isSufficient: false, reason: "evaluation error" };
  }
}

// VOICE LAYER (Использует маркеры вместо JSON)
async function generateVersions(dossier: ResearchDossier): Promise<{ siteTitle: string; siteExcerpt: string; siteContent: string; telegramTitle: string; telegramPost: string }> {
  const prompt = `Ты — медицинский редактор. Напиши материал на основе строго утверждённого Dossier.
Тема: ${dossier.chosenAngle}
Факты: ${dossier.keyFacts.join("; ")}
Известно: ${dossier.whatIsKnown.join("; ")}
Ограничения: ${dossier.limitations.join("; ")}
Безопасные выводы: ${dossier.safeClaims.join("; ")}

ЗАПРЕЩЕНО выдумывать новые факты, цифры или дозировки.
Пиши ТОЛЬКО на чистом HTML (без Markdown).
ЗАПРЕЩЕНО добавлять блоки "Литература", "Источники", "Ключевые слова", "Авторы", "Дата публикации". Система добавит источники автоматически.

Ответь СТРОГО в следующем формате (без JSON, используй маркеры):

[TITLE]
Заголовок для сайта (до 70 символов)
[/TITLE]

[EXCERPT]
Описание для сайта (до 170 символов)
[/EXCERPT]

[CONTENT]
HTML-статья для сайта. Структура: <h2>Введение</h2><p>...</p><h2>Что показало исследование</h2>...
[/CONTENT]

[TG_TITLE]
Строгий заголовок для Telegram-поста (без эмодзи, без кликбейта)
[/TG_TITLE]

[TG_POST]
Короткий пост для Telegram. СТРОГИЕ ПРАВИЛА:
1. ПОЛНОСТЬЮ ЗАПРЕЩЕНЫ любые эмодзи.
2. ЗАПРЕЩЕНЫ хэштеги (#).
3. ЗАПРЕЩЕНЫ рекламные клише ("Узнайте больше", "Откройте для себя", "Снова в моде").
4. Тон: спокойный, экспертный, как у топовых медицинских каналов.
5. Формат (строго):
   - 1-2 предложения: суть проблемы (например, что часто беспокоит пациентов).
   - 2-3 предложения: что показало исследование (только факты из Dossier).
   - 1 предложение: ограничение или важное предупреждение (например, "метод не заменяет основное лечение").
   - 1 предложение: мягкий призыв. СТРОГО используй эту фразу: "Подробнее о механизмах действия — в полной статье на сайте:"
Текст должен быть разделен на абзацы пустой строкой.
[/TG_POST]`;

  const result = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 3000,
  });

  const rawText = result.choices[0]?.message?.content ?? "";
  console.log("[VoiceLayer] GigaChat raw response:", rawText);

  // Пуленепробиваемый экстрактор: если нет закрывающего тега, берет до следующего маркера
  const extractBlock = (startTag: string): string => {
    const regex = new RegExp(`\\[${startTag}\\]([\\s\\S]*?)\\[/${startTag}\\]`, "i");
    let match = rawText.match(regex);
    if (match) return match[1].trim();
    
    // Fallback: если закрывающий тег забыт, берем до следующего маркера [...
    const fallbackRegex = new RegExp(`\\[${startTag}\\]([\\s\\S]*?)(?:\\[\\/?[A-Z_]+\\]|$)`, "i");
    match = rawText.match(fallbackRegex);
    return match ? match[1].trim() : "";
  };

  // Очищаем от возможных остатков маркеров
  let siteTitle = extractBlock("TITLE").replace(/\\[\\/?TITLE\\]/g, '').trim() || dossier.chosenAngle;
  let siteExcerpt = extractBlock("EXCERPT").replace(/\\[\\/?EXCERPT\\]/g, '').trim() || "Профессиональный разбор темы";
  let siteContent = extractBlock("CONTENT").replace(/\\[\\/?CONTENT\\]/g, '').trim() || `<p>${rawText}</p>`;
  let telegramTitle = sanitizeBadEncoding(extractBlock("TG_TITLE").replace(/\\[\\/?TG_TITLE\\]/g, '').trim()) || siteTitle;
  let telegramPost = sanitizeBadEncoding(extractBlock("TG_POST").replace(/\\[\\/?TG_POST\\]/g, '').trim()) || "Подробнее на сайте";

  return { siteTitle, siteExcerpt, siteContent, telegramTitle, telegramPost };
}

// MAIN PIPELINE
export async function generateArticle(topic: string, cluster?: KeywordCluster): Promise<GenerationResult> {
  const maxAttempts = 3;
  let currentTopic = topic;
  let currentCluster = cluster;
  const attemptedTopics = new Set<string>(); // Запоминаем темы, которые уже пробовали

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`[Pipeline] Attempt ${attempt + 1}: ${currentTopic}`);
    
    const pubmedQuery = currentCluster?.pubmedQuery || currentTopic;
    const rawPubmed = await getPubMedArticles(pubmedQuery, 5);
    const crossrefArticles = await searchCrossRef(pubmedQuery, 3);
    const allArticles = [...rawPubmed, ...crossrefArticles].slice(0, 7) as EvidenceItem[];

    if (allArticles.length === 0) {
      let nextCluster = getRandomCluster();
      let safetyCounter = 0;
      while (attemptedTopics.has(nextCluster.primary) && safetyCounter < 10) {
        nextCluster = getRandomCluster();
        safetyCounter++;
      }
      currentCluster = nextCluster;
      currentTopic = currentCluster.primary;
      attemptedTopics.add(currentTopic);
      continue;
    }

    const { isSufficient, dossier, reason } = await evaluateEvidence(currentTopic, allArticles);
    
    if (!isSufficient || !dossier) {
      console.log(`[Pipeline] PIVOT. Reason: ${reason}.`);
      let nextCluster = getRandomCluster();
      let safetyCounter = 0;
      while (attemptedTopics.has(nextCluster.primary) && safetyCounter < 10) {
        nextCluster = getRandomCluster();
        safetyCounter++;
      }
      currentCluster = nextCluster;
      currentTopic = currentCluster.primary;
      attemptedTopics.add(currentTopic);
      continue;
    }

    const versions = await generateVersions(dossier);
    
    const siteContent = sanitizeContent(versions.siteContent || "").trim();
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

  console.log("[Pipeline] Failed to find sufficient evidence after max attempts. No draft created.");
  return { status: "no_suitable_topic" };
}

function generateSourcesBlock(articles: EvidenceItem[]): string {
  if (articles.length === 0) return "";
  const sources = articles.map(a => {
    // Экранируем HTML в данных источника
    const safeTitle = a.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeJournal = (a.journal || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeUrl = a.url.replace(/"/g, "&quot;");
    return `<li><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeTitle}</a> — ${safeJournal}, ${a.pubDate}</li>`;
  }).join("");
  return `\n<h2>Источники</h2>\n<ul>${sources}</ul>`;
}

export async function generateArticleByKeyword(keyword: string): Promise<GenerationResult> {
  const cluster = getClusterByKeyword(keyword);
  return generateArticle(keyword, cluster);
}
