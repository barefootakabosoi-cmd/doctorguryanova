import { getPubMedArticles } from "./pubmed";
import { searchCrossRef } from "./crossref";
import { chatCompletion } from "./gigachat";
import { getClusterByKeyword, getRandomCluster, type KeywordCluster } from "./seo-keywords";
import type { BlogPost } from "./blog-data";
import type { ResearchDossier, EvidenceItem, GeneratedContent, SafeClaim, ClaimStrength } from "./research-dossier";
import sanitizeHtml from "sanitize-html";

export interface GeneratedClaimsValidation {
  valid: boolean;
  text: string;
  reason?: string;
}

const CLAIM_STRENGTHS: ClaimStrength[] = ["descriptive", "suggestive", "moderate", "strong"];
const CLAIM_STRENGTH_RANK: Record<ClaimStrength, number> = {
  descriptive: 0, suggestive: 1, moderate: 2, strong: 3,
};

/**
 * The model may label evidence optimistically. This server-side ceiling keeps
 * a weak/old or unclassified record from supporting a strong marketing claim.
 */
export function maximumClaimStrength(evidenceRefs: string[], evidence: EvidenceItem[]): ClaimStrength {
  const refs = evidenceRefSet(evidence);
  const cited = evidence.filter((item) => {
    const ids = [item.pmid ? `PMID:${item.pmid}` : "", item.doi ? `DOI:${item.doi.toLowerCase()}` : ""];
    return ids.some((id) => id && evidenceRefs.some((ref) =>
      ref.toLowerCase().startsWith("doi:") ? id === `DOI:${ref.slice(4).toLowerCase()}` : id === ref
    ));
  });
  if (cited.length === 0 || evidenceRefs.some((ref) => !refs.has(ref.toLowerCase().startsWith("doi:") ? `DOI:${ref.slice(4).toLowerCase()}` : ref))) {
    return "descriptive";
  }
  const hasModernSynthesis = cited.some((item) =>
    ["systematic_review", "meta_analysis", "guideline"].includes(item.sourceType || "") && publicationYear(item) >= 2015
  );
  if (hasModernSynthesis) return "moderate";
  const hasModernRct = cited.some((item) => item.sourceType === "rct" && publicationYear(item) >= 2010);
  return hasModernRct ? "suggestive" : "descriptive";
}

function publicationYear(item: EvidenceItem): number {
  const match = item.pubDate.match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : 0;
}

/** Exclude records that cannot be responsibly used as clinical evidence. */
export function filterEligibleEvidence(topic: string, articles: EvidenceItem[]): EvidenceItem[] {
  const normalizedTopic = topic.toLowerCase();
  const unrelatedRedFlags = ["poisoning", "intoxication", "toxicology"];
  return articles.filter((item) => {
    if (!item.abstract?.trim() || (!item.pmid && !item.doi)) return false;
    const haystack = `${item.title} ${item.abstract}`.toLowerCase();
    return !unrelatedRedFlags.some((word) => haystack.includes(word) && !normalizedTopic.includes(word));
  });
}

export function evidenceUsedByClaims(dossier: ResearchDossier): EvidenceItem[] {
  const usedRefs = new Set(dossier.safeClaims.flatMap((claim) => claim.evidenceRefs.map((ref) =>
    ref.toLowerCase().startsWith("doi:") ? `DOI:${ref.slice(4).toLowerCase()}` : ref
  )));
  return dossier.evidence.filter((item) =>
    (item.pmid && usedRefs.has(`PMID:${item.pmid}`)) ||
    (item.doi && usedRefs.has(`DOI:${item.doi.toLowerCase()}`))
  );
}

function evidenceRefSet(evidence: EvidenceItem[]): Set<string> {
  return new Set(evidence.flatMap((item) => [
    item.pmid ? `PMID:${item.pmid}` : "",
    item.doi ? `DOI:${item.doi.toLowerCase()}` : "",
  ].filter(Boolean)));
}

/** Stable, copyable source cards for every LLM stage. Claims may cite only IDs shown here. */
export function evidenceCards(evidence: EvidenceItem[]): string {
  return evidence.map((item) => {
    const refs = [item.pmid ? `PMID:${item.pmid}` : "", item.doi ? `DOI:${item.doi}` : ""].filter(Boolean).join("; ");
    return `- ${refs || "NO_STABLE_ID"}: ${item.title} (${item.journal}, ${item.pubDate}). Abstract: ${item.abstract || "not available"}`;
  }).join("\n");
}

/**
 * Validates the boundary between the LLM Science Gate and the deterministic
 * pipeline. In particular, legacy `safeClaims: string[]` is rejected instead
 * of being silently cast to a trusted dossier.
 */
export function createDossierFromScienceGateResponse(
  topic: string,
  rawDossier: unknown,
  evidence: EvidenceItem[]
): { dossier?: ResearchDossier; reason?: string } {
  if (!rawDossier || typeof rawDossier !== "object") return { reason: "missing dossier" };
  const value = rawDossier as Record<string, unknown>;
  const cleanText = (input: unknown) => sanitizeHtml(typeof input === "string" ? input : "", { allowedTags: [], allowedAttributes: {} }).trim();
  const cleanArray = (input: unknown): string[] | null =>
    Array.isArray(input) && input.every((entry) => typeof entry === "string")
      ? input.map(cleanText).filter(Boolean)
      : null;
  const refs = evidenceRefSet(evidence);
  if (!Array.isArray(value.safeClaims) || value.safeClaims.length === 0) return { reason: "missing safe claims" };

  const safeClaims: SafeClaim[] = [];
  for (const rawClaim of value.safeClaims) {
    // Reject legacy string claims explicitly: they have no evidence binding.
    if (!rawClaim || typeof rawClaim !== "object" || Array.isArray(rawClaim)) return { reason: "legacy or malformed safe claim" };
    const claim = rawClaim as Record<string, unknown>;
    const text = cleanText(claim.text);
    const strength = claim.strength;
    const evidenceRefs = claim.evidenceRefs;
    if (!text || typeof strength !== "string" || !CLAIM_STRENGTHS.includes(strength as ClaimStrength) ||
        !Array.isArray(evidenceRefs) || evidenceRefs.length === 0 || !evidenceRefs.every((ref) => typeof ref === "string" && refs.has(ref.toLowerCase().startsWith("doi:") ? `DOI:${ref.slice(4).toLowerCase()}` : ref))) {
      return { reason: "safe claim has invalid evidence references" };
    }
    const normalizedRefs = evidenceRefs.map(String);
    const maximumStrength = maximumClaimStrength(normalizedRefs, evidence);
    // The model often over-labels a claim's confidence. This is not a reason to
    // discard an otherwise source-bound dossier: retain the claim, but make the
    // server-owned ceiling authoritative. The generated text still must pass the
    // downstream anti-amplification validation.
    const requestedStrength = strength as ClaimStrength;
    const effectiveStrength = CLAIM_STRENGTH_RANK[requestedStrength] > CLAIM_STRENGTH_RANK[maximumStrength]
      ? maximumStrength
      : requestedStrength;
    if (effectiveStrength !== requestedStrength) {
      console.warn(`[ScienceGate] Claim strength capped: ${requestedStrength} -> ${effectiveStrength}`);
    }
    safeClaims.push({ text, strength: effectiveStrength, evidenceRefs: normalizedRefs });
  }

  const keyFacts = cleanArray(value.keyFacts);
  const whatIsKnown = cleanArray(value.whatIsKnown);
  const whatIsNotKnown = cleanArray(value.whatIsNotKnown);
  const limitations = cleanArray(value.limitations);
  const confidence = value.confidence;
  if (!keyFacts || !whatIsKnown || !whatIsNotKnown || !limitations || !["high", "medium", "low"].includes(String(confidence))) {
    return { reason: "malformed dossier fields" };
  }
  const chosenAngle = cleanText(value.chosenAngle);
  if (!chosenAngle) return { reason: "missing chosen angle" };
  return { dossier: { topic, chosenAngle, evidence, keyFacts, whatIsKnown, whatIsNotKnown, limitations, safeClaims, confidence: confidence as ResearchDossier["confidence"] } };
}

export function validateGeneratedClaims(text: string, dossier: ResearchDossier): GeneratedClaimsValidation {
  if (!text) return { valid: true, text: "" };
  let cleanText = text;

  // 1. Вырезаем библиографию
  cleanText = cleanText.replace(/(##|<h[2-6][^>]*>|\*\*|####)\s*(Литература|Источники|Список литературы|Библиография)[\s\S]*$/i, "");

  // 2. Вырезаем нумерованные ссылки [1], [1-4]
  cleanText = cleanText.replace(/\[\d+(?:[-–,\s]+\d+)*\]/g, "");

  // Internal evidence labels are instructions for the model, never public copy.
  // Do not silently remove them: regenerate a reader-facing version instead.
  if (/\[(?:descriptive|suggestive|moderate|strong)\s*;\s*(?:PMID|DOI):[^\]]+\]/i.test(cleanText)) {
    return { valid: false, text: cleanText, reason: "Internal evidence marker leaked into public copy" };
  }

  // Humanizer is required to return HTML, not residual Markdown.
  if (/(?:^|\s)#{1,3}\s|\*\*[^*]+\*\*|(?<!\*)\*[^*\n]+\*(?!\*)/.test(cleanText)) {
    return { valid: false, text: cleanText, reason: "Markdown leaked into public copy" };
  }

  // 3. Generated author/year citations are not allowed in generated copy.
  // Reject rather than deleting a fragment and leaving an orphaned attribution.
  if (/\([^)]*?(?:19|20)\d{2}[^)]*?\)/.test(cleanText)) {
    return { valid: false, text: cleanText, reason: "Generated author/year citation detected" };
  }

  // 4. Вырезаем строки GOST-списка
  cleanText = cleanText.replace(/^\s*\d+\.\s+.*$/gm, "");

  // 5. Вырезаем любые URL
  cleanText = cleanText.replace(/https?:\/\/[^\s<]+/gi, "");

  // 6. Проверяем внешние PMID/DOI
  const validPmids = dossier.evidence.map(e => e.pmid).filter(Boolean) as string[];
  const validDois = dossier.evidence.map(e => e.doi).filter(Boolean) as string[];

  const pmidMatches = cleanText.match(/PMID:?\s*\d{7,8}/gi) || [];
  for (const match of pmidMatches) {
    const pmidInnerMatch = match.match(/\d{7,8}/);
    if (!pmidInnerMatch) continue;
    const pmid = pmidInnerMatch[0];
    if (!validPmids.includes(pmid)) {
      return { valid: false, text: cleanText, reason: `External PMID detected: ${pmid}` };
    }
  }

  const doiMatches = cleanText.match(/10\.\d{4,}\/[^\s"<>]+/gi) || [];
  for (const match of doiMatches) {
    const doi = match.replace(/\.$/, "");
    if (!validDois.some(d => doi.includes(d))) {
      return { valid: false, text: cleanText, reason: `External DOI detected: ${doi}` };
    }
  }

  // 7. Reject promotional or overconfident *claims*, not neutral discussion of
  // effectiveness. For example, “оценка эффективности” and “при неэффективности
  // терапии” are legitimate limitation/clinical-context phrases.
  const forbiddenClaimPatterns: Array<[RegExp, string]> = [
    [/доказан[а-яё]*/i, "доказан"],
    [/доказали/i, "доказали"],
    [/гарантиру[а-яё]*/i, "гарантиру"],
    [/излеч[а-яё]*/i, "излеч"],
    [/(?:эффективн[а-яё]*|результативн[а-яё]*)\s+(?:метод|способ|лечени[а-яё]*|терапи[а-яё]*|операци[а-яё]*|процедур[а-яё]*)/i, "strong effectiveness claim"],
    [/(?:наиболее|сам[а-яё]*)\s+(?:эффективн[а-яё]*|результативн[а-яё]*)/i, "comparative effectiveness claim"],
    [/(?:доказан[а-яё]*|подтвержд[а-яё]*)\s+(?:эффективност|польз|результат)[а-яё]*/i, "proven effectiveness"],
    [/(?:эффективност|польз|результат)[а-яё]*\s+подтвержд[а-яё]*/i, "proven effectiveness"],
    [/(?:лечит|вылечивает|нормализует)/i, "guaranteed clinical outcome"],
  ];
  for (const [pattern, label] of forbiddenClaimPatterns) {
    if (pattern.test(cleanText)) {
      return { valid: false, text: cleanText, reason: `Forbidden amplifier detected: ${label}` };
    }
  }

  // Очищаем пустые теги
  cleanText = cleanText.replace(/<p>\s*<\/p>/gi, "");
  cleanText = cleanText.replace(/<li>\s*<\/li>/gi, "");

  return { valid: true, text: cleanText.trim() };
}



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
export function markdownToHtml(md: string): string {
  if (!md) return "";
  let html = md;

  // Если внутри <p> есть Markdown (## или - ), вырезаем его из <p>
  if (html.includes("<p>") && (html.includes("##") || html.includes("- "))) {
    html = html.replace(/<p>([\s\S]*?)<\/p>/gi, "$1");
  }
  // Если уже чистый HTML (без Markdown) — возвращаем как есть.
  // A bare text line after a heading is not well-formed article HTML and is
  // normalized below into a paragraph.
  const hasMarkdown = /(^|\n)(?:#{1,3}\s|[-*]\s)|\*\*[^*]+\*\*|(?<!\*)\*[^*\n]+\*(?!\*)/.test(html);
  const hasBareLine = html.split(/\n/).some(line => {
    const value = line.trim();
    return Boolean(value) && !value.startsWith("<") && !value.endsWith(">");
  });
  if (!hasMarkdown && !hasBareLine) return html;

  // Заголовки
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold/Italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, "<em>$1</em>");

  // Списки
  const lines = html.split("\n");
  let inList = false;
  const result: string[] = [];
  for (const line of lines) {
    if (line.match(/^[-*] /)) {
      const liContent = line.replace(/^[-*] /, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      if (!inList) { result.push("<ul>"); inList = true; }
      result.push(`<li>${liContent}</li>`);
    } else {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(line);
    }
  }
  if (inList) result.push("</ul>");
  html = result.join("\n");

  // Paragraphs. Keep structural blocks intact but never leave reader-facing
  // text as an orphan outside <p>.
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    const headingWithText = trimmed.match(/^(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)[\n\s]*([\s\S]+)$/i);
    if (headingWithText && headingWithText[2].trim() && !headingWithText[2].trim().startsWith("<")) {
      return `${headingWithText[1]}<p>${headingWithText[2].trim().replace(/\n/g, "<br>")}</p>`;
    }
    if (trimmed.startsWith("<h") || trimmed.startsWith("<ul>") || trimmed.startsWith("<ol>") || trimmed.startsWith("<li>")) return trimmed;
    return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
  }).filter(Boolean).join("\n");

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
Источники. У каждого источника в начале указаны его ЕДИНСТВЕННЫЕ допустимые ID:
${evidenceCards(articles)}

Правила оценки:
- topicMatches=true, только если источники непосредственно относятся к теме, а не просто к соседнему симптому или методу.
- Для каждого safeClaims.evidenceRefs копируй один или несколько ID ТОЧНО из списка источников выше. Не придумывай PMID или DOI.
- Если доказательств недостаточно, topicMatches=false или невозможно создать хотя бы один claim с реальным ID, верни dossier: null.
- Не используй поле isSufficient: сервер сам применит числовые критерии.

Сформируй JSON БЕЗ КОММЕНТАРИЕВ:
{
  "topicMatches": boolean,
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
    "safeClaims": [{
      "text": "Только осторожное утверждение, прямо следующее из источника",
      "strength": "descriptive | suggestive | moderate | strong",
      "evidenceRefs": ["PMID:12345678"]
    }],
    "confidence": "high | medium | low"
  } | null
}

Ограничения силы: strong не используй. Для источников без явно указанного современного systematic review, meta-analysis или guideline используй только descriptive. Не называй эффект доказанным, эффективным, гарантированным или лечебным.`;

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

    // Server-owned decision: never infer success from the model's prose reason.
    const highQuality = Number(parsed.highQuality) || 0;
    const mediumQuality = Number(parsed.mediumQuality) || 0;
    const clinicalCases = Number(parsed.clinicalCases) || 0;
    const topicMatches = parsed.topicMatches === true;
    const isMathSufficient = highQuality >= 1 || (mediumQuality >= 2 && clinicalCases === 0);
    const finalIsSufficient = isMathSufficient && topicMatches;
    console.log("[ScienceGate] decision", {
      topic, highQuality, mediumQuality, clinicalCases, topicMatches,
      isMathSufficient, finalIsSufficient, hasDossier: Boolean(parsed.dossier),
    });

    if (finalIsSufficient && parsed.dossier) {
      const parsedDossier = createDossierFromScienceGateResponse(topic, parsed.dossier, articles);
      if (!parsedDossier.dossier) {
        console.warn(`[ScienceGate] Rejected dossier: ${parsedDossier.reason}`);
        return { isSufficient: false, reason: parsedDossier.reason };
      }
      return { isSufficient: true, dossier: parsedDossier.dossier };
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
РАЗРЕШЁННЫЕ УТВЕРЖДЕНИЯ (используй только их, не добавляй новые медицинские факты):
${dossier.safeClaims.map((claim) => `- [${claim.strength}; ${claim.evidenceRefs.join(", ")}] ${claim.text}`).join("\n")}
ОГРАНИЧЕНИЯ (их можно упомянуть только как ограничения): ${dossier.limitations.join("; ")}

Не добавляй факты из общих знаний, даже если они кажутся очевидными: диагнозы, препараты, процедуры, механизмы, показания, противопоказания, побочные эффекты, цифры и сравнения. Не добавляй авторов, годы, PMID, DOI или ссылки. Не делай сильнее разрешённых утверждений. Формат: обычный текст без библиографии.`;

  const result = await chatCompletion({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2, // Максимальная точность
    max_tokens: 1500,
  });
  return result.choices[0]?.message?.content ?? "";
}

// STEP 3: HUMANIZER (Живой язык + разные версии)
async function humanizeDraft(
  draft: string,
  dossier: ResearchDossier,
  previousFailure?: string
): Promise<{ siteTitle: string; siteExcerpt: string; siteContent: string; telegramTitle: string; telegramPost: string }> {
  const correction = previousFailure
    ? `\nПРЕДЫДУЩАЯ ВЕРСИЯ БЫЛА ОТКЛОНЕНА: ${previousFailure}. Исправь именно это; не повторяй запрещённую формулировку.\n`
    : "";
  const prompt = `Ты — медицинский редактор. Твоя задача — переписать сухой научный черновик в живую, экспертную статью для сайта и Telegram.

НАУЧНЫЙ ЧЕРНОВИК:
 ${draft}

РАЗРЕШЁННЫЕ УТВЕРЖДЕНИЯ:
${dossier.safeClaims.map((claim) => `- [${claim.strength}; ${claim.evidenceRefs.join(", ")}] ${claim.text}`).join("\n")}
ОГРАНИЧЕНИЯ: ${dossier.limitations.join("; ")}${correction}
ЖЁСТКИЕ ПРАВИЛА HUMANIZER:
1. Используй только утверждения из списка выше и не усиливай их. Черновик — лишь материал для редакторской переработки: игнорируй любой факт из него, которого нет в разрешённых утверждениях или ограничениях.
2. Не добавляй факты из общих знаний: диагнозы, препараты, операции, процедуры, механизмы, показания, противопоказания, побочные эффекты, цифры, сравнения, авторов, годы, PMID, DOI и ссылки.
3. Не пиши «доказано», «доказанная эффективность», «эффективный метод», «наиболее эффективный», «гарантирует», «лечит», «излечивает», «нормализует». Слово «эффективность» допустимо только в ограничительном контексте: «данных для оценки эффективности недостаточно» или «нужны исследования для оценки эффективности».
4. ЗАПРЕЩЕНЫ клише ("Многие пациенты", "Узнайте больше", "В современном мире", "Снова в моде").
5. Тон: спокойный, осторожный, без рекламных обещаний.
6. Пиши ТОЛЬКО на чистом HTML (без Markdown): каждый абзац заключай в <p>, заголовки — в <h2>. Не используй *, **, [descriptive; PMID:…] или любые служебные метки.
7. ЗАПРЕЩЕНО добавлять блоки "Литература", "Источники", "Ключевые слова". Система добавит их автоматически.
8. Для descriptive-утверждений не используй «широко применяется», «рекомендуется», «снижает риск», «улучшает» или описание механизма. Передавай только осторожный факт из разрешённого утверждения и его ограничения.

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
2. Не добавляй авторов, годы, PMID, DOI, библиографию или ссылки.
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
  // Preserve HTML for [CONTENT]; a plain version is for logs only.
  const plainRawText = rawText.replace(/<[^>]+>/g, '');
  console.log("[Humanizer] GigaChat raw response:", plainRawText);

  const extract = (tag: string): string => {
    const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[/${tag}\\]`, "i");
    const match = rawText.match(regex);
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
    const tgFallback = rawText.match(/\[TG_POST\]([\s\S]*?)(?:\[\/?[A-Z_]+\]|$)/i);
    telegramPost = tgFallback ? tgFallback[1].trim() : "";
  }
  // Если TG-пост пустой, используем описание статьи (лучше, чем заглушка)
  if (!telegramPost) {
    telegramPost = siteExcerpt || "Профессиональный разбор темы. Подробнее на сайте:";
  }

  return { siteTitle, siteExcerpt, siteContent, telegramTitle, telegramPost };
}

/**
 * The LLM may repeatedly use promotional wording even after a precise retry
 * instruction. Do not discard an evidence-approved topic solely because of
 * that editorial failure: fall back to a deliberately conservative,
 * source-backed shell. It makes no treatment or effectiveness claim; the
 * automatically appended bibliography remains available for clinician review.
 */
function conservativeFallback(dossier: ResearchDossier): { siteTitle: string; siteExcerpt: string; siteContent: string; telegramTitle: string; telegramPost: string } {
  const topic = sanitizeHtml(dossier.chosenAngle || dossier.topic, { allowedTags: [], allowedAttributes: {} }).trim();
  const title = `Обзор публикаций: ${topic}`.slice(0, 120);
  const excerpt = "Краткий обзор доступных публикаций по теме с указанием ограничений имеющихся данных.";
  const content = [
    "<h2>О чём этот обзор</h2>",
    `<p>В материале собраны публикации по теме «${topic}». Перечень использованных источников приведён в конце страницы.</p>`,
    "<h2>Как интерпретировать данные</h2>",
    "<p>Результаты отдельных исследований и обзоров не заменяют очную оценку врача. Применимость данных зависит от клинической ситуации, сопутствующих состояний и целей обследования или лечения.</p>",
    "<h2>Ограничения</h2>",
    "<p>Для практических решений важны дизайн исследований, их актуальность и качество доступных данных. При необходимости тактику обсуждают со специалистом.</p>"
  ].join("\n");
  const telegramPost = "Подготовлен обзор доступных публикаций по теме. В статье указаны источники и ограничения имеющихся данных; решение о тактике принимают после консультации со специалистом.";
  return { siteTitle: title, siteExcerpt: excerpt, siteContent: content, telegramTitle: title, telegramPost };
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
    const allArticles = filterEligibleEvidence(currentTopic, [...rawPubmed, ...crossrefArticles].slice(0, 7) as EvidenceItem[]);
    console.log(`[Pipeline] Eligible evidence: ${allArticles.length}`);

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

    // STEP 3: Humanizer с валидацией и регенерацией
    let versions: { siteTitle: string; siteExcerpt: string; siteContent: string; telegramTitle: string; telegramPost: string };
    let validation: GeneratedClaimsValidation;
    let telegramValidation: GeneratedClaimsValidation;
    let titleValidation: GeneratedClaimsValidation;
    let excerptValidation: GeneratedClaimsValidation;
    let humanizerAttempts = 0;
    let previousHumanizerFailure: string | undefined;
    const maxHumanizerAttempts = 3;

    do {
      console.time(`Pipeline Step 3 (Humanizer Attempt ${humanizerAttempts + 1})`);
      versions = await humanizeDraft(draft, dossier, previousHumanizerFailure);
      console.timeEnd(`Pipeline Step 3 (Humanizer Attempt ${humanizerAttempts + 1})`);

      titleValidation = validateGeneratedClaims(versions.siteTitle || "", dossier);
      excerptValidation = validateGeneratedClaims(versions.siteExcerpt || "", dossier);
      validation = validateGeneratedClaims(versions.siteContent || "", dossier);
      telegramValidation = validateGeneratedClaims(versions.telegramPost || "", dossier);
      if (!titleValidation.valid || !excerptValidation.valid || !validation.valid || !telegramValidation.valid) {
        previousHumanizerFailure = titleValidation.reason || excerptValidation.reason || validation.reason || telegramValidation.reason;
        console.warn(`[Pipeline] Humanizer validation failed (Attempt ${humanizerAttempts + 1}): ${previousHumanizerFailure}`);
      }
      humanizerAttempts++;
    } while ((!titleValidation.valid || !excerptValidation.valid || !validation.valid || !telegramValidation.valid) && humanizerAttempts < maxHumanizerAttempts);

    if (!titleValidation.valid || !excerptValidation.valid || !validation.valid || !telegramValidation.valid) {
      console.warn("[Pipeline] Humanizer failed after max attempts; using conservative evidence-only fallback.");
      versions = conservativeFallback(dossier);
      titleValidation = validateGeneratedClaims(versions.siteTitle, dossier);
      excerptValidation = validateGeneratedClaims(versions.siteExcerpt, dossier);
      validation = validateGeneratedClaims(versions.siteContent, dossier);
      telegramValidation = validateGeneratedClaims(versions.telegramPost, dossier);
      // The fallback is deterministic. Keep a defensive guard in case its text
      // is changed in the future without matching validator updates.
      if (!titleValidation.valid || !excerptValidation.valid || !validation.valid || !telegramValidation.valid) {
        console.error("[Pipeline] Conservative fallback failed validation; PIVOT.");
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
    }

    const siteContent = sanitizeContent(validation.text).trim();
    const telegramPost = telegramValidation.text;
    const slug = slugify(versions.siteTitle || currentTopic);
    const now = new Date().toISOString().split("T")[0];

    const post: BlogPost = {
      slug,
      title: titleValidation.text || currentTopic,
      excerpt: excerptValidation.text || `Профессиональный разбор: ${currentTopic}`,
      content: siteContent + generateSourcesBlock(evidenceUsedByClaims(dossier)),
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
        telegramPost: sanitizeHtml(telegramPost, { allowedTags: [], allowedAttributes: {} }),
        seo: { title: post.title, description: post.excerpt, keywords: post.keywords.join(", ") },
        dossier,
        sources: evidenceUsedByClaims(dossier)
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
