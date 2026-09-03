import { getPubMedArticles } from "./pubmed";
import { searchCrossRef } from "./crossref";
import { chatCompletion } from "./gigachat";
import { getClusterByKeyword, getRandomCluster, type KeywordCluster } from "./seo-keywords";
import type { BlogPost } from "./blog-data";
import type { ResearchDossier, EvidenceItem, GeneratedContent } from "./research-dossier";
import sanitizeHtml from "sanitize-html";

// Детерминированная очистка вывода от ИИ-галлюцинаций (внешних PMID, DOI, авторов, мусора)
export function validateAndCleanOutput(text: string, dossier: ResearchDossier): string {
  if (!text) return "";
  let cleanText = text;

  // 1. Удаляем выдуманных авторов и атрибуции
  cleanText = cleanText.replace(/<p>\s*Автор:[\s\S]*?<\/p>/gi, "");
  cleanText = cleanText.replace(/Автор:\s*[А-Яа-яЁё\s\.\,]+/gi, "");
  cleanText = cleanText.replace(/Иванов\s*[А-Я]\.\s*[А-Я]\./gi, "");

  // 2. Удаляем шаблонный мусор ("ознакомьтесь с полным текстом...")
  cleanText = cleanText.replace(/<p>[^<]*(Для получения подробной информации|ознакомьтесь с полным текстом)[^<]*<\/p>/gi, "");
  cleanText = cleanText.replace(/(Для получения подробной информации|ознакомьтесь с полным текстом)[\s\S]*?\./gi, "");

  // 3. Удаляем ЛЮБЫЕ сгенерированные ИИ блоки источников (строго по заголовкам)
  cleanText = cleanText.replace(/(##|<h2[^>]*>)\s*(Литература|Источники|Библиография)[\s\S]*$/i, "");

  // 4. Удаляем нумерованные ссылки [1], [2] и т.д.
  cleanText = cleanText.replace(/\[\d+\]/g, "");

  // 5. Удаляем ссылки в формате (Фамилия И.О., Год) или (Familia et al., God)
  // Жадный regex: ловит любые символы в скобках, если там есть 4 цифры (год)
  cleanText = cleanText.replace(/\([^)]*?(?:19|20)\d{2}[^)]*?\)/g, "");

  // 6. Удаляем строки, похожие на типичный список литературы (начинающиеся с цифры, точки и заглавной буквы)
  // Жадный regex до конца строки
  cleanText = cleanText.replace(/^\s*\d+\.\s+[А-ЯЁA-Z].*$/gm, "");

  // 7. Проверяем внешние PMID/DOI
  const validPmids = dossier.evidence.map(e => e.pmid).filter(Boolean) as string[];
  const validDois = dossier.evidence.map(e => e.doi).filter(Boolean) as string[];

  // Ищем PMID (обычно 7-8 цифр)
  const pmidMatches = cleanText.match(/PMID:?\s*\d{7,8}/gi) || [];
  for (const match of pmidMatches) {
    const pmidInnerMatch = match.match(/\d{7,8}/);
    if (!pmidInnerMatch) continue;
    const pmid = pmidInnerMatch[0];
    if (!validPmids.includes(pmid)) {
      cleanText = cleanText.replace(new RegExp(`<p>[^<]*${match}[^<]*<\/p>`, "gi"), "");
      cleanText = cleanText.replace(new RegExp(`[^.]*${match}[^.]*\.`, "gi"), "");
    }
  }

  // Ищем DOI
  const doiMatches = cleanText.match(/10\.\d{4,}\/[^\s"<>]+/gi) || [];
  for (const match of doiMatches) {
    const doi = match.replace(/\.$/, "");
    if (!validDois.some(d => doi.includes(d))) {
      cleanText = cleanText.replace(new RegExp(`<p>[^<]*${match}[^<]*<\/p>`, "gi"), "");
      cleanText = cleanText.replace(new RegExp(`[^.]*${match}[^.]*\.`, "gi"), "");
    }
  }

// Очищаем от пустых тегов, если они остались после удаления
  cleanText = cleanText.replace(/<p>\s*<\/p>/gi, "");
  cleanText = cleanText.replace(/<li>\s*<\/li>/gi, "");

  return cleanText.trim();
}



// Конвертер Markdown -> HTML (для упрямого GigaChat)
function markdownToHtml(md: string): string {
  if (!md) return "";
  let html = md;
  
  // Если внутри <p> есть Markdown (## или - ), вырезаем его из <p>
  if (html.includes("<p>") && (html.includes("##") || html.includes("- "))) {
    html = html.replace(/<p>([\s\S]*?)<\/p>/gi, "$1");
  }
  // Если уже чистый HTML (без Markdown) — возвращаем как есть
  if (!html.includes("##") && !html.includes("- ") && !html.includes("**")) return html;
  
  // Заголовки
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  
  // Bold/Italic
  html = html.replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  
  // Списки
  const lines = html.split("\\n");
  let inList = false;
  const result: string[] = [];
  for (const line of lines) {
    if (line.match(/^[-*] /)) {
      const liContent = line.replace(/^[-*] /, "").replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>");
      if (!inList) { result.push("<ul>"); inList = true; }
      result.push(`<li>${liContent}</li>`);
    } else {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(line);
    }
  }
  if (inList) result.push("</ul>");
  html = result.join("\\n");
  
  // Параграфы
  const paragraphs = html.split(/\\n\\n+/);
  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("<h") || trimmed.startsWith("<ul>") || trimmed.startsWith("<li>")) return trimmed;
    return `<p>${trimmed.replace(/\\n/g, "<br>")}</p>`;
  }).filter(Boolean).join("\\n");
  
  return html;
}



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

// STEP 2: SCIENTIFIC DRAFT (Сухой черновик)
async function generateScientificDraft(dossier: ResearchDossier): Promise<string> {
  const prompt = `Ты — медицинский аналитик. На основе утверждённого Dossier напиши сухой научный черновик статьи на русском языке.
Тема: ${dossier.chosenAngle}
Факты (используй строго): ${dossier.keyFacts.join("; ")}
Что известно: ${dossier.whatIsKnown.join("; ")}
Ограничения: ${dossier.limitations.join("; ")}

ЗАПРЕЩЕНО добавлять воду, введение и заключение. Только пересказ фактов с указанием авторов и годов (если есть в фактах). Формат: обычный текст.`;

  const result = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2, // Максимальная точность
    max_tokens: 1500,
  });
  return result.choices[0]?.message?.content ?? "";
}

// STEP 3: HUMANIZER (Живой язык + разные версии)
async function humanizeDraft(draft: string, dossier: ResearchDossier): Promise<{ siteTitle: string; siteExcerpt: string; siteContent: string; telegramTitle: string; telegramPost: string }> {
  const prompt = `Ты — медицинский редактор. Твоя задача — переписать сухой научный черновик в живую, экспертную статью для сайта и Telegram.

НАУЧНЫЙ ЧЕРНОВИК:
 ${draft}

ЖЁСТКИЕ ПРАВИЛА HUMANIZER:
1. Сохрани ВСЕ medical facts, цифры, дозировки, авторов и годы из черновика. ЗАПРЕЩЕНО их менять или убирать.
2. ЗАПРЕЩЕНЫ клише ("Многие пациенты", "Узнайте больше", "В современном мире", "Снова в моде").
3. ЗАПРЕЩЕН страдательный залог ("было доказано"). Используй активный залог ("Исследователи доказали").
4. Тон: спокойный, экспертный, как у топовых медицинских каналов.
5. Пиши ТОЛЬКО на чистом HTML (без Markdown).
6. ЗАПРЕЩЕНО добавлять блоки "Литература", "Источники", "Ключевые слова". Система добавит их автоматически.

Ответь СТРОГО в следующем формате (маркеры):

[TITLE]
Профессиональный заголовок для сайта (до 70 символов)
[/TITLE]

[EXCERPT]
Содержательный текст описания для сайта (до 170 символов)
[/EXCERPT]

[CONTENT]
HTML-статья для сайта. Структура: <h2>Введение</h2><p>...</p><h2>Что показало исследование</h2>...
[/CONTENT]

[TG_TITLE]
Строгий заголовок для Telegram-поста
[/TG_TITLE]

[TG_POST]
Короткий пост для Telegram. СТРОГИЕ ПРАВИЛА:
1. ЗАПРЕЩЕНЫ эмодзи и хэштеги.
2. ОБЯЗАТЕЛЬНО укажи автора и год (например, "Bapat et al. (1998) доказали...").
3. Формат: 1 предложение (суть) + 2 предложения (что выяснили авторы) + 1 предложение (ограничение) + призыв: "Подробнее о механизмах действия — в полной статье на сайте:"
[/TG_POST]`;

  const result = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5, // Баланс между точностью и живостью
    max_tokens: 2500,
  });

  let rawText = result.choices[0]?.message?.content ?? "";
  // Вырезаем возможные Markdown code-blocks (```)
  rawText = rawText.replace(/```[a-z]*\\n?/g, '').replace(/```/g, '');
  const plainRawText = rawText.replace(/<[^>]+>/g, '');
  console.log("[Humanizer] GigaChat raw response:", plainRawText);

  const extract = (tag: string): string => {
    const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[/${tag}\\]`, "i");
    const match = plainRawText.match(regex);
    return match ? match[1].trim() : "";
  };

  // Умный Fallback
  let siteTitle = extract("TITLE") || dossier.chosenAngle;
  siteTitle = siteTitle.charAt(0).toUpperCase() + siteTitle.slice(1);
  
  let siteExcerpt = extract("EXCERPT") || "Профессиональный разбор темы";
  let siteContent = markdownToHtml(extract("CONTENT")) || `<p>${draft}</p>`;
  let telegramTitle = extract("TG_TITLE") || siteTitle;
  let telegramPost = extract("TG_POST").replace(/\\[\\/?TG_POST\\]/g, '').trim();
  if (!telegramPost) {
    // Fallback: ищем текст после [TG_POST] до конца или до следующего маркера
    const tgFallback = plainRawText.match(/\[TG_POST\]([\s\S]*?)(?:\[\/?[A-Z_]+\]|$)/i);
    telegramPost = tgFallback ? tgFallback[1].trim() : "";
  }
  // Если TG-пост пустой, используем описание статьи (лучше, чем заглушка)
  if (!telegramPost) {
    telegramPost = siteExcerpt || "Профессиональный разбор темы. Подробнее на сайте:";
  }

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

    // STEP 2: Scientific Draft
    console.time("Pipeline Step 2 (Draft)");
    const draft = await generateScientificDraft(dossier);
    console.timeEnd("Pipeline Step 2 (Draft)");

    // STEP 3: Humanizer
    console.time("Pipeline Step 3 (Humanizer)");
    const versions = await humanizeDraft(draft, dossier);
    console.timeEnd("Pipeline Step 3 (Humanizer)");
    
    const siteContent = sanitizeContent(versions.siteContent || "").trim();
    const slug = slugify(versions.siteTitle || currentTopic);
    const now = new Date().toISOString().split("T")[0];

    const post: BlogPost = {
      slug,
      title: versions.siteTitle || currentTopic,
      excerpt: versions.siteExcerpt || `Профессиональный разбор: ${currentTopic}`,
      content: siteContent + generateSourcesBlock(dossier.evidence),
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

export function generateSourcesBlock(articles: EvidenceItem[]): string {
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
