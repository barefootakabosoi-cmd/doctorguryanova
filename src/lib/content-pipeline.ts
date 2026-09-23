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
  // Crossref records and some PubMed records carry no structured type, but a
  // conservative bibliographic label in the title is still a structural fact.
  // Reuse the exact inference trusted by the eligibility filter, keeping the
  // synthesis-vs-trial distinction: a synthesis anchors moderate claims, a
  // single trial only suggestive ones.
  const isSynthesis = (item: EvidenceItem) =>
    ["systematic_review", "meta_analysis", "guideline"].includes(item.sourceType || "") ||
    (!item.sourceType && titleSays(item, SYNTHESIS_TITLE_PATTERN));
  const isTrial = (item: EvidenceItem) =>
    item.sourceType === "rct" ||
    (!item.sourceType && titleSays(item, RCT_TITLE_PATTERN));
  if (cited.some((item) => isSynthesis(item) && publicationYear(item) >= 2015)) return "moderate";
  if (cited.some((item) => isTrial(item) && publicationYear(item) >= 2010)) return "suggestive";
  return "descriptive";
}

function publicationYear(item: EvidenceItem): number {
  const match = item.pubDate.match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : 0;
}

/**
 * Records that are not suitable inputs for an automatically generated clinical
 * article. This is deliberately server-owned: an LLM must not promote a case
 * report, an author-branded technique, or a product-marketing paper to a
 * "safe claim" merely by assigning it a flattering quality label.
 */
const CLINICAL_CASE_PATTERN = /\b(?:case report|case study|clinical case|случа[йея]|клиническ[а-я]* случа[йя])\b/i;
const UNSUPPORTED_PRODUCT_PATTERN = /\b(?:traumeel|zeel\s*t|биорегулятор\w*|homeopath\w*|гомеопат\w*)\b/i;
const AUTHOR_METHOD_PATTERN = /\b(?:author['’]?s? (?:original )?method|original method|авторск(?:ая|ий) методик[а-я]*)\b/i;

const SYNTHESIS_TITLE_PATTERN = /\b(?:clinical practice guideline|practice guideline|guidance paper|consensus statement|systematic review|meta[ -]?analysis)\b/i;
// Conservative bibliographic label: "randomized-controlled study" in a title is
// a structural fact about the design; wording inside an abstract is not.
const RCT_TITLE_PATTERN = /\brandomi[sz]ed[- ](?:controlled[- ])?(?:clinical[- ])?(?:trial|study)\b|\brandomi[sz]ed\s+controlled\s+trial\b/i;

function titleSays(item: EvidenceItem, pattern: RegExp): boolean {
  return pattern.test(item.title);
}

export function isTrustedClinicalEvidence(item: EvidenceItem): boolean {
  const type = item.sourceType || "";
  if (["guideline", "systematic_review", "meta_analysis", "rct"].includes(type)) return true;

  // PubMed/Crossref adapters do not always expose publication type. Infer only
  // conservative, bibliographic labels from the title; never infer a design
  // from results claimed in an abstract.
  const title = item.title;
  return SYNTHESIS_TITLE_PATTERN.test(title) || RCT_TITLE_PATTERN.test(title);
}

/** Exclude records that cannot be responsibly used as clinical evidence. */
export function filterEligibleEvidence(topic: string, articles: EvidenceItem[]): EvidenceItem[] {
  const normalizedTopic = topic.toLowerCase();
  const unrelatedRedFlags = ["poisoning", "intoxication", "toxicology"];
  return articles.filter((item) => {
    if (!item.abstract?.trim() || (!item.pmid && !item.doi)) return false;
    const haystack = `${item.title} ${item.abstract}`.toLowerCase();
    if (unrelatedRedFlags.some((word) => haystack.includes(word) && !normalizedTopic.includes(word))) return false;
    if (item.sourceType === "clinical_case" || CLINICAL_CASE_PATTERN.test(item.title)) return false;
    if (UNSUPPORTED_PRODUCT_PATTERN.test(haystack) || AUTHOR_METHOD_PATTERN.test(haystack)) return false;
    return true;
  });
}

/**
 * An automatic medical publication needs an independent evidence anchor. Weak
 * records may help a human researcher, but are not passed to the Science Gate
 * and therefore can never become public claims or fallback bibliography.
 */
export function filterEvidenceForAutomaticPublication(topic: string, articles: EvidenceItem[]): EvidenceItem[] {
  return filterEligibleEvidence(topic, articles).filter(isTrustedClinicalEvidence);
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

function evidenceIds(items: EvidenceItem[]): string {
  return items
    .map((item) => (item.pmid ? `PMID:${item.pmid}` : item.doi ? `DOI:${item.doi}` : item.url))
    .join(", ");
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
  evidence: EvidenceItem[],
  attemptId?: string
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
      console.warn(`[ScienceGate]${attemptId ? ` [${attemptId}]` : ""} Claim strength capped: ${requestedStrength} -> ${effectiveStrength}`);
    }
    // Whitelist hygiene: claim texts feed the approved-vocabulary whitelist
    // downstream, so run the anti-amplification table here with the claim's
    // own (server-capped) strength. Rejection sends the attempt to retry.
    const claimAmplifier = findForbiddenAmplifier(text, effectiveStrength);
    if (claimAmplifier) {
      return { reason: `safe claim text rejected: ${claimAmplifier}` };
    }
    safeClaims.push({ text, strength: effectiveStrength, evidenceRefs: normalizedRefs });
  }

  const keyFacts = cleanArray(value.keyFacts);
  const whatIsKnown = cleanArray(value.whatIsKnown);
  const whatIsNotKnown = cleanArray(value.whatIsNotKnown);
  const limitations = cleanArray(value.limitations);
  // Clinical cautions extracted from source abstracts (e.g. post-exertional
  // exacerbation): optional, dossiers without the field get an empty list.
  const cautions = cleanArray(value.cautions) ?? [];
  const confidence = value.confidence;
  if (!keyFacts || !whatIsKnown || !whatIsNotKnown || !limitations || !["high", "medium", "low"].includes(String(confidence))) {
    return { reason: "malformed dossier fields" };
  }
  const chosenAngle = cleanText(value.chosenAngle);
  if (!chosenAngle) return { reason: "missing chosen angle" };
  // Diagnostic trace: what Science Gate accepted vs what the claims actually cite.
  // Makes "3 sources declared, 1 in the dossier" visible per attempt.
  const citedRefs = Array.from(new Set(safeClaims.flatMap((claim) => claim.evidenceRefs)));
  console.log(`[ScienceGate]${attemptId ? ` [${attemptId}]` : ""} dossier accepted: evidence ${evidence.length} [${evidenceIds(evidence)}]; cited in safeClaims: ${citedRefs.length} [${citedRefs.join(", ")}]`);
  return { dossier: { topic, chosenAngle, evidence, keyFacts, whatIsKnown, whatIsNotKnown, limitations, cautions, safeClaims, confidence: confidence as ResearchDossier["confidence"] } };
}

// ---------------------------------------------------------------------------
// Conservative grounding dictionary (Evidence Contract, bugfix step 1).
//
// Where the list comes from: manual curation of specific drug and therapy
// names that occur in the site's clinical clusters (headache, insomnia, back
// pain, hypertension) and in known model hallucination patterns ("triptans
// of the new generation" invented from general knowledge). Generic editorial
// words ("терапия", "лечение", "метод") are deliberately NOT listed so
// ordinary language cannot trigger a false block.
//
// Word forms: a stem matches by lowercase substring, which tolerates Russian
// case endings ("триптан" ~ "триптаны", "триптанов"; "ласмидитан" ~
// "ласмидитане") and Latin names ("CGRP", "lasmiditan").
//
// Unsupported = the stem appears in the public copy but nowhere in the
// approved dossier vocabulary (topic, chosenAngle, safeClaims, limitations,
// keyFacts, whatIsKnown, whatIsNotKnown). Negative context does NOT
// legitimise a mention: a substance absent from the dossier must not be
// named at all, even in negation.
//
// Known limitations, kept explicit:
// - synonyms and trade names are not recognised; a determined model can
//   still evade by paraphrase. This validator is a conservative net, not a
//   semantic guarantee;
// - semantic entailment ("does this statement actually follow from the
//   source?") remains an open architectural task for a dedicated
//   entailment-checking step. Not solvable by a regex by design.
const KNOWN_DRUG_OR_METHOD_STEMS: readonly string[] = [
  // Triptans and acute antimigraine drugs
  "триптан", "суматриптан", "золмитриптан", "ризатриптан", "наратриптан", "элетриптан",
  "ласмидитан", "lasmiditan", "гепант", "cgrp", "дигидроэрготамин", "эрготамин",
  // Antiepileptics / prophylaxis / cardiovascular
  "карбамазепин", "окскарбазепин", "габапентин", "прегабалин", "ламотриджин", "фенобарбитал",
  "баклофен", "топирамат", "амитриптилин", "венлафаксин", "дулоксетин", "пропранолол",
  "метопролол", "бисопролол", "верапамил", "флунаризин", "кандесартан", "лизиноприл",
  // Analgesics / NSAIDs
  "ибупрофен", "напроксен", "парацетамол", "ацетилсалицилов", "диклофенак", "кетопрофен",
  // Sleep pharmacotherapy
  "мелатонин", "агомелатин", "золпидем", "залеплон", "доксиламин", "тразодон",
  "суворексант", "лемборексант", "даридорексант",
  // Botulinum toxin and injections
  "ботулотоксин", "блокад",
  // Drug classes
  "антидепрессант", "нейролептик", "бензодиазепин", "миорелаксант", "антигистамин", "нпвп",
  // Specific non-drug methods (author-branded / often hallucinated)
  "иглорефлексотерап", "акупунктур", "гирудотерап", "пиявк", "озонотерап", "криотерап",
  "магнитотерап", "лазеротерап", "фототерап", "светотерап", "ароматерап", "гипнотерап",
  "транскраниальн", "электромиостимуляц", "детензор", "бальнеотерап", "грязелеч",
];

const forbiddenClaimPatterns: Array<[RegExp, string, boolean | "moderate" | "strong"]> = [
  // [pattern, label, gate: true | "moderate" | "strong"]
  [/гарантиру[а-яё]*/i, "guarantee language", true],
  [/излеч[а-яё]*/i, "cure language", true],
  [/(?:лечит|вылечивает|нормализует)/i, "guaranteed clinical outcome", true],
  [/(?:лучший|идеальн[а-яё]*|уникальн[а-яё]*)\s+(?:метод|способ|подход|вариант)/i, "marketing superlative", true],
  // A bare "доказан/доказано" is an absolute assertive claim regardless of
  // dossier strength: even a moderate dossier warrants hedged clinical
  // wording, never a flat proof statement.
  [/доказан[а-яё]*/i, "доказан", true],
  [/доказали/i, "доказали", "moderate"],
  [/(?:эффективн[а-яё]*|результативн[а-яё]*|действенн[а-яё]*)\s+(?:метод|способ|лечени[а-яё]*|терапи[а-яё]*|операци[а-яё]*|процедур[а-яё]*)/i, "strong effectiveness claim", "moderate"],
  [/(?:наиболее|сам[а-яё]*)\s+(?:эффективн[а-яё]*|результативн[а-яё]*)/i, "comparative effectiveness claim", "moderate"],
  [/(?:доказан[а-яё]*|подтвержд[а-яё]*)\s+(?:эффективност|польз|результат)[а-яё]*/i, "proven effectiveness", "moderate"],
  [/(?:эффективност|польз|результат)[а-яё]*\s+подтвержд[а-яё]*/i, "proven effectiveness", "moderate"],
  // Consensus phrasing ("признается эффективным") implies accepted clinical
  // practice — stronger than any single dossier supports. Name the study
  // result instead ("в исследовании показано").
  [/призна(?:[её]тся|н[аоы])\s+(?:эффективн|результативн|действенн)[а-яё]*/i, "consensus effectiveness phrasing", true],
  // Generalizing a studied intervention into "эффективный метод/способ
  // лечения/борьбы <нозология>" overstates even a moderate dossier: evidence
  // covers the studied intervention, not a treatment-of-record.
  [/(?:эффективн|результативн|действенн)[а-яё]*\s+(?:метод|способ)[а-яё]*\s+(?:лечени[а-яё]*|терапи[а-яё]*|борьбы|снижени[а-яё]*|уменьшени[а-яё]*|устранени[а-яё]*|коррекци[а-яё]*)/i, "treatment-method generalization", "strong"],
  [/универсальн[а-яё]*\s+(?:метод|способ|подход|средство|лечени[а-яё]*|терапи[а-яё]*)/i, "universal method claim", true],
  // Universal applicability promise; negated forms ("не подходит всем") stay legitimate.
  [/(?<!не\s)(?:помогает|поможет|подходит|подойдёт)\s+(?:всем|каждому|каждой)/i, "universal patient applicability", true],
  // Load-increase imperatives ("постепенно увеличивайте активность") are
  // prescriptive advice that can harm post-exertional patients; negated
  // informational forms ("не рекомендуется увеличивать") do not match.
  [/(?:увеличивайте|увеличьте|наращивайте|занимайтесь\s+больше|тренируйтесь\s+больше)/i, "load-increase imperative", true],
];

// Shared anti-amplification check over the same pattern table. Used for final
// copy (validateGeneratedClaims) AND at dossier admission time (safeClaim
// texts), so an over-broad wording cannot legalize itself later through the
// whitelist of approved phrases.
export function findForbiddenAmplifier(cleanText: string, dossierMaxStrength: ClaimStrength): string | null {
  for (const [pattern, label, gate] of forbiddenClaimPatterns) {
    if (gate === true) {
      if (pattern.test(cleanText)) return label;
      continue;
    }
    const minRank = gate === "strong" ? CLAIM_STRENGTH_RANK.strong : CLAIM_STRENGTH_RANK.moderate;
    if (CLAIM_STRENGTH_RANK[dossierMaxStrength] < minRank && pattern.test(cleanText)) return label;
  }
  return null;
}

// Quantitative grounding: when the dossier rests on a systematic review /
// meta-analysis / guideline, the site article must carry concrete figures
// from the evidence (N of trials, effect size, comparator) instead of the
// vague "исследования показали" template. Telegram copy is exempt (length).
export function validateQuantitativeCoverage(siteContent: string, dossier: ResearchDossier): GeneratedClaimsValidation {
  const hasQuantEvidence = dossier.evidence.some((e) => /systematic.?review|meta.?analys|guideline/i.test(String(e.sourceType || "")));
  // Figures must come from article TEXT, not markup: heading tags like <h2>
  // contain "2", which made /\d/ always true and this gate never rejected a
  // figure-free article (production draft-1790100173338: meta_analysis
  // evidence, zero figures in the body, gate passed). Test visible text only.
  const visibleText = (siteContent || "").replace(/<[^>]*>/g, " ");
  if (!hasQuantEvidence || /\d/.test(visibleText)) return { valid: true, text: siteContent };
  return { valid: false, text: siteContent, reason: "quantitative results of the review not reflected in the article (no figures from the evidence)" };
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
  // The reason carries the offending fragment so pipeline logs show exactly
  // which construction breaks validation (the attempt loop prefixes the field).
  // Model-generated links are forbidden: sources are appended by the system,
  // and model hrefs historically leaked markdown residue (href="[url](url)").
  // Evidence Contract: reject instead of repair.
  if (/<a[\s>]/i.test(cleanText)) {
    return { valid: false, text: cleanText, reason: "Model-generated link detected (sources are appended by the system)" };
  }

  const markdownLeak = cleanText.match(/(?:^|\s)#{1,3}\s|\*\*[^*]+\*\*|(?<!\*)\*[^*\n]+\*(?!\*)/);
  if (markdownLeak) {
    const fragment = markdownLeak[0].trim().replace(/\s+/g, " ").slice(0, 60);
    return { valid: false, text: cleanText, reason: `Markdown leaked into public copy: "${fragment}"` };
  }

  // 3. Generated author/year citations are not allowed in generated copy.
  // Reject rather than deleting a fragment and leaving an orphaned attribution.
  // Digit boundaries (?<!\d /?!\d) so a PMID like 31927422 (contains "1927")
  // inside parentheses is not misread as a year, while "(...в 2019 году)" still is.
  if (/\([^)]*?(?<!\d)(?:19|20)\d{2}(?!\d)[^)]*?\)/.test(cleanText)) {
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
  //
  // When the dossier itself carries a moderate+ source-bound claim, a careful
  // clinical restatement of that claim (“рассматривается в рекомендациях как
  // терапия первой линии”) is legitimate editorial wording, not an amplifier.
  // Marketing absolutes stay forbidden at every strength.
  const dossierMaxStrength = dossier.safeClaims.reduce<ClaimStrength>(
    (max, claim) => (CLAIM_STRENGTH_RANK[claim.strength] > CLAIM_STRENGTH_RANK[max] ? claim.strength : max),
    "descriptive"
  );
  const allowsClinicalEffectiveness = CLAIM_STRENGTH_RANK[dossierMaxStrength] >= CLAIM_STRENGTH_RANK.moderate;

  const amplifier = findForbiddenAmplifier(cleanText, dossierMaxStrength);
  if (amplifier) {
    return { valid: false, text: cleanText, reason: `Forbidden amplifier detected: ${amplifier}` };
  }

  // Evidence-contract grounding: a named drug/method must be grounded in the
  // dossier. Catches "триптаны нового поколения" when the dossier only
  // contains CGRP/lasmiditan, plus the whole class of invented-substance
  // hallucinations covered by the conservative dictionary above.
  const approvedVocabulary = [
    dossier.topic, dossier.chosenAngle,
    ...dossier.safeClaims.map((claim) => claim.text),
    ...dossier.limitations, ...dossier.keyFacts, ...dossier.whatIsKnown, ...dossier.whatIsNotKnown,
  ].join(" ").toLowerCase();
  const lowerText = cleanText.toLowerCase();
  for (const stem of KNOWN_DRUG_OR_METHOD_STEMS) {
    if (lowerText.includes(stem) && !approvedVocabulary.includes(stem)) {
      return { valid: false, text: cleanText, reason: `Unsupported drug/method mention: ${stem}` };
    }
  }

  // Очищаем пустые теги
  cleanText = cleanText.replace(/<p>\s*<\/p>/gi, "");
  cleanText = cleanText.replace(/<li>\s*<\/li>/gi, "");

  return { valid: true, text: cleanText.trim() };
}

// ---------------------------------------------------------------------------
// Title/topic consistency. Deliberately NOT a literal-match check: a good
// title may reformulate the angle ("мигрень у женщин" -> "лечение мигрени во
// время беременности"). Two minimal, explainable checks instead:
// 1. subject survival — at least one meaningful topical word of the dossier
//    (stem-based, so «мигрень» ~ «мигрени») must appear in the title;
// 2. audience switch — if both dossier and title name a population group,
//    they must be the same group. Refinement inside a group is allowed
//    («женщин» -> «беременных» passes); switching the population
//    («у женщин» -> «у взрослых пациентов») is rejected.
// Semantic "does the title promise more than the dossier" stays an open task
// for the future entailment step (see the dictionary comment above).
const AUDIENCE_GROUPS: Readonly<Record<string, readonly string[]>> = {
  women: ["женщин", "беременн", "кормящ"],
  men: ["мужчин"],
  children: ["детей", "детск", "подростк", "школьн", "дошкольн"],
  adults: ["взросл", "пожил", "старческ"],
};
const TITLE_ENTITY_STOPWORDS = new Set([
  "лечение", "лечения", "лечению", "лечении", "метод", "методы", "подход", "подходы",
  "новые", "новый", "новых", "современные", "современный", "обзор", "применение",
  "пациент", "пациенты", "пациентов", "тема", "темы", "вопрос", "вопросы",
  "женщин", "женщины", "женщинам", "мужчин", "мужчины", "детей", "взрослых",
  "взрослые", "пожилых", "пожилые",
]);

function wordStem(word: string): string {
  return word.slice(0, Math.max(4, word.length - 2));
}

export function validateTitleAgainstDossier(title: string, dossier: ResearchDossier): GeneratedClaimsValidation {
  const titleLower = title.toLowerCase();

  // Outcome-promise titles ("помогает справиться", "избавит", "вылечит") turn
  // an evidence summary into a treatment promise. A title must state what the
  // research shows, not promise a result to the reader.
  const promiseMatch = titleLower.match(/(?:помогает|поможет|избавит|избавляет|устранит|устраняет|вылечит|справиться|гарантирует)/);
  if (promiseMatch) {
    return { valid: false, text: title, reason: `title promises an outcome ("${promiseMatch[0]}") — state what the research shows instead` };
  }
  const topicLower = `${dossier.topic} ${dossier.chosenAngle}`.toLowerCase();

  const topicWords = (topicLower.match(/[а-яёa-z]+/g) ?? [])
    .filter((word) => word.length >= 5 && !TITLE_ENTITY_STOPWORDS.has(word));
  const entityStems = Array.from(new Set(topicWords.map(wordStem)));
  if (entityStems.length > 0 && !entityStems.some((stem) => titleLower.includes(stem))) {
    return { valid: false, text: title, reason: "title drifts away from the dossier subject" };
  }

  const audienceOf = (text: string): string | null => {
    for (const [group, stems] of Object.entries(AUDIENCE_GROUPS)) {
      if (stems.some((stem) => text.includes(stem))) return group;
    }
    return null;
  };
  const topicAudience = audienceOf(topicLower);
  const titleAudience = audienceOf(titleLower);
  if (topicAudience && titleAudience && topicAudience !== titleAudience) {
    return { valid: false, text: title, reason: `title audience drift: ${topicAudience} -> ${titleAudience}` };
  }

  return { valid: true, text: title };
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
  cleanText = cleanText.replace(/\((?<!\d)[^)]*?(?<!\d)(?:19|20)\d{2}(?!\d)[^)]*?\)/g, "");

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

  // Заголовки (4+ решёток сворачиваем в h3 — модель иногда шлёт ####)
  html = html.replace(/^#{4,} (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  // ##/###/#### headings normalized deterministically (humanizer kept emitting "###"
  // despite prompt rules — local E2E, 2026-09-23); plain-text copy never carries them.
  html = html.replace(/^#{2,4} (.+)$/gm, "<h2>$1</h2>");
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

/**
 * TITLE/EXCERPT/TG_* are plain-text fields. Residual markdown there is a
 * formatting artifact of the model, not content: strip the markers
 * deterministically BEFORE validation, so the validated text is exactly the
 * published text. No words are added, removed or reordered.
 */
export function stripResidualMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*/g, "");
}

export function sanitizeBadEncoding(text: string): string {
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
async function evaluateEvidence(topic: string, articles: EvidenceItem[], attemptId?: string): Promise<{ isSufficient: boolean; dossier?: ResearchDossier; reason?: string }> {
  if (articles.length === 0) return { isSufficient: false, reason: "no trusted clinical evidence found" };
  if (!articles.some(isTrustedClinicalEvidence)) return { isSufficient: false, reason: "missing guideline, synthesis, or RCT evidence anchor" };

  const prompt = `Ты — строгий медицинский рецензент. Оцени источники для темы: "${topic}".
Источники. У каждого источника в начале указаны его ЕДИНСТВЕННЫЕ допустимые ID:
${evidenceCards(articles)}

Правила оценки:
- topicMatches=true, только если источники непосредственно относятся к теме, а не просто к соседнему симптому или методу.
- Для каждого safeClaims.evidenceRefs копируй один или несколько ID ТОЧНО из списка источников выше. Не придумывай PMID или DOI.
- В этот список уже попали только независимые guideline, systematic review, meta-analysis или RCT. Не повышай силу утверждения сверх источника.
- Если доказательств недостаточно, topicMatches=false или невозможно создать хотя бы один claim с реальным ID, верни dossier: null.
- Для метаанализов и систематических обзоров обязательно включай в safeClaims и keyFacts количественные результаты из abstract: число включённых исследований, размеры эффекта с доверительными интервалами (например, "Hedges' g -0.52 (95% CI -0.73..-0.32)"), группы сравнения. Без цифр статья о метаанализе не пройдёт проверку содержательности.
- Заполни cautions: клинические предостережения, прямо следующие из источников (нежелательные явления, популяции, где эффект не изучен, ухудшение после нагрузки). Чего нет в abstract — не придумывай; если ничего нет, верни пустой массив.
   Формулируй каждый safeClaim как результат исследования («В метаанализе из N исследований показано снижение X, g = …, 95% CI …»), а не как свойство метода: формулировки «эффективный метод лечения», «действенный способ борьбы» запрещены.
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
    "cautions": ["Клинические предостережения из источников: кому осторожно, нежелательные явления, ухудшение после нагрузки — только то, что есть в abstract"],
    "safeClaims": [{
      "text": "Только осторожное утверждение, прямо следующее из источника",
      "strength": "descriptive | suggestive | moderate | strong",
      "evidenceRefs": ["PMID:12345678"]
    }],
    "confidence": "high | medium | low"
  } | null
}

Ограничения силы: strong не используй. Если в списке есть современный (2015 или позже) systematic review, meta-analysis или guideline — максимум moderate. Для источников без такого якоря используй только descriptive или suggestive. Не называй эффект доказанным, гарантированным или лечебным.`;

  try {
    const result = await chatCompletion({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
    });

    let rawText = result.choices[0]?.message?.content ?? "{}";
    console.log(`[ScienceGate]${attemptId ? ` [${attemptId}]` : ""} GigaChat raw response:`, rawText);

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) rawText = jsonMatch[0];

    // ЖЁСТКАЯ ОЧИСТКА JSON: вырезаем комментарии, убираем trailing commas, чиним Python Booleans.
    // Одинарные кавычки меняем ТОЛЬКО вне строковых литералов: слепое .replace(/'/g,'"')
    // рвало валидные ответы на апострофах внутри значений (Hedges' g -> Hedges" g ->
    // "Unexpected token g") — production E2E, PMID 36345726, 2026-09-23.
    rawText = rawText.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '') // comments
                     .replace(/,\s*([}\]])/g, '$1') // trailing commas
                     .replace(/\bTrue\b/g, 'true')
                     .replace(/\bFalse\b/g, 'false')
                     .replace(/\bNone\b/g, 'null');

    // Fast path: the model already returned valid JSON — do not "repair" it.
    let parsed: Record<string, unknown> | null = null;
    try {
      const direct: unknown = JSON.parse(rawText);
      if (direct !== null && typeof direct === "object") {
        parsed = direct as Record<string, unknown>;
      }
    } catch {
      parsed = null;
    }
    if (!parsed) {
      // Repair path: swap single-quoted delimiters to doubles while leaving
      // apostrophes INSIDE string values (Hedges' g) untouched.
      const repaired = rawText.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (m: string) =>
        m.startsWith('"') ? m : m.replace(/^'/, '"').replace(/'$/, '"')
      )
                     .replace(/,\s*([}\]])/g, '$1')
                     .replace(/\bTrue\b/g, 'true')
                     .replace(/\bFalse\b/g, 'false')
                     .replace(/\bNone\b/g, 'null');
      const repairedParsed: unknown = JSON.parse(repaired);
      if (repairedParsed === null || typeof repairedParsed !== "object") {
        throw new Error("ScienceGate response is not a JSON object");
      }
      parsed = repairedParsed as Record<string, unknown>;
    }

    // Server-owned decision: never infer success from the model's prose reason.
    const highQuality = Number(parsed.highQuality) || 0;
    const mediumQuality = Number(parsed.mediumQuality) || 0;
    const clinicalCases = Number(parsed.clinicalCases) || 0;
    const topicMatches = parsed.topicMatches === true;
    const isMathSufficient = highQuality >= 1 || (mediumQuality >= 2 && clinicalCases === 0);
    const finalIsSufficient = isMathSufficient && topicMatches;
    console.log(`[ScienceGate]${attemptId ? ` [${attemptId}]` : ""} decision`, {
      topic, highQuality, mediumQuality, clinicalCases, topicMatches,
      isMathSufficient, finalIsSufficient, hasDossier: Boolean(parsed.dossier),
    });

    if (finalIsSufficient && parsed.dossier) {
      const parsedDossier = createDossierFromScienceGateResponse(topic, parsed.dossier, articles, attemptId);
      if (!parsedDossier.dossier) {
        console.warn(`[ScienceGate] Rejected dossier: ${parsedDossier.reason}`);
        return { isSufficient: false, reason: parsedDossier.reason };
      }
      return { isSufficient: true, dossier: parsedDossier.dossier };
    } else {
      const modelReason: unknown = parsed.reason;
      const reason = typeof modelReason === "string" && modelReason.trim() ? modelReason : "insufficient evidence";
      return { isSufficient: false, reason };
    }
  } catch (e) {
    console.error(`[ScienceGate]${attemptId ? ` [${attemptId}]` : ""} Error:`, e);
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
КЛИНИЧЕСКИЕ ПРЕДОСТЕРЕЖЕНИЯ (обязательно отрази отдельным абзацем, если список не пуст; факты сверх списка добавлять нельзя): ${(dossier.cautions ?? []).join("; ")}
Если в разрешённых утверждениях или ограничениях есть численные результаты (число исследований, размер эффекта, доверительный интервал, с чем сравнивали) — включи их в текст дословно.

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
  const dossierMaxStrength = dossier.safeClaims.reduce<ClaimStrength>(
    (max, claim) => (CLAIM_STRENGTH_RANK[claim.strength] > CLAIM_STRENGTH_RANK[max] ? claim.strength : max),
    "descriptive"
  );
  const allowsClinicalEffectiveness = CLAIM_STRENGTH_RANK[dossierMaxStrength] >= CLAIM_STRENGTH_RANK.moderate;
  const prompt = `Ты — медицинский редактор. Твоя задача — переписать сухой научный черновик в живую, экспертную статью для сайта и Telegram.

ТЕМА ДОСЬЕ (заголовок и текст обязаны сохранять её предмет и целевую группу; обобщение темы запрещено): ${dossier.chosenAngle}
Исходная тема запроса: ${dossier.topic}

НАУЧНЫЙ ЧЕРНОВИК:
 ${draft}

РАЗРЕШЁННЫЕ УТВЕРЖДЕНИЯ (используй ТОЛЬКО их смысл; служебные метки вида [moderate; PMID:...] в текст статьи НЕ переноси — они только для сверки):
${dossier.safeClaims.map((claim) => `- ${claim.text}`).join("\n")}
ОГРАНИЧЕНИЯ: ${dossier.limitations.join("; ")}${correction}
ЖЁСТКИЕ ПРАВИЛА HUMANIZER:
1. Используй только утверждения из списка выше и не усиливай их. Черновик — лишь материал для редакторской переработки: игнорируй любой факт из него, которого нет в разрешённых утверждениях или ограничениях.
2. Не добавляй факты из общих знаний: диагнозы, препараты, операции, процедуры, механизмы, показания, противопоказания, побочные эффекты, цифры, сравнения, авторов, годы, PMID, DOI и ссылки.
3. Никогда не пиши «гарантирует», «лечит», «излечивает», «нормализует», «лучший метод», «уникальный метод». ${
  allowsClinicalEffectiveness
    ? "В этом досье есть клинически значимое утверждение уровня moderate и выше: аккуратная клиническая формулировка разрешена, например «когнитивно-поведенческая терапия рассматривается в клинических рекомендациях как терапия первой линии при хронической бессоннице». Но не пиши «доказано», «доказанная эффективность», «эффективный метод», «наиболее эффективный» и не обещай результат конкретному пациенту."
    : "Не пиши «доказано», «доказанная эффективность», «эффективный метод», «наиболее эффективный». Слово «эффективность» допустимо только в ограничительном контексте: «данных для оценки эффективности недостаточно» или «нужны исследования для оценки эффективности»."
}
4. ЗАПРЕЩЕНЫ клише ("Многие пациенты", "Узнайте больше", "В современном мире", "Снова в моде").
5. Тон: спокойный, осторожный, без рекламных обещаний.
6. Пиши ТОЛЬКО на чистом HTML (без Markdown): каждый абзац заключай в <p>, заголовки — в <h2>. Не используй *, **, [descriptive; PMID:…] или любые служебные метки.
7. ЗАПРЕЩЕНО добавлять блоки "Литература", "Источники", "Ключевые слова". Система добавит их автоматически.
8. Если есть КЛИНИЧЕСКИЕ ПРЕДОСТЕРЕЖЕНИЯ — отрази их в статье отдельным абзацем без приукрашивания. Для тем про физическую активность не подавай наращивание нагрузки как универсальную рекомендацию: если в предостережениях есть ухудшение после нагрузки, укажи, что активность подбирается индивидуально.
9. Численные результаты из разрешённых утверждений (число исследований, размер эффекта, доверительные интервалы, компаратор) включай в текст дословно. Запрещено заменять их общими фразами вроде «исследования показали положительный эффект».
   Обязательно: числа (число исследований, размер эффекта, доверительные интервалы, компаратор) переноси дословно из разрешённых утверждений досье, не перефразируй в общие слова.
   Обязательно: заголовки разделов — только HTML-теги <h2>/<h3>; Markdown-разметка (###, **жирный**, [текст](url)) запрещена во всех полях вывода.
10. Заголовок — только то, что показали исследования («Что показали исследования…», «Что известно о…»). Обещания результата читателю («помогает справиться», «избавит», «вылечит») запрещены.
8. Для descriptive-утверждений не используй «широко применяется», «рекомендуется», «снижает риск», «улучшает» или описание механизма. Передавай только осторожный факт из разрешённого утверждения и его ограничения.
9. Заголовок ([TITLE] и [TG_TITLE]) обязан сохранять предмет темы и её целевую группу. Уточнение внутри группы допустимо («мигрень у женщин» → «мигрень у беременных женщин»), обобщение с потерей группы — нет («мигрень у женщин» → «мигрень у взрослых пациентов» запрещено).

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
  rawText = rawText.replace(/```[a-z]*\n?/g, '').replace(/```/g, '');
  // Deterministic character-level cleanup: the model sometimes emits U+FFFD
  // ("ко<FFFD>гнитивно"). Formatting only — no words are added or removed.
  rawText = sanitizeBadEncoding(rawText);
  // Preserve HTML for [CONTENT]; a plain version is for logs only.
  const plainRawText = rawText.replace(/<[^>]+>/g, '');
  console.log("[Humanizer] GigaChat raw response:", plainRawText);

  const extract = (tag: string): string => {
    const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[/${tag}\\]`, "i");
    const match = rawText.match(regex);
    return match ? match[1].trim() : "";
  };

  // TITLE/EXCERPT/TG_* are plain-text fields: residual markdown there is a
  // formatting artifact, deterministically stripped BEFORE validation (same
  // policy as bibliography/URL cleanup). CONTENT keeps markdownToHtml.
  let siteTitle = stripResidualMarkdown(extract("TITLE") || dossier.chosenAngle);
  siteTitle = siteTitle.charAt(0).toUpperCase() + siteTitle.slice(1);

  let siteExcerpt = stripResidualMarkdown(extract("EXCERPT") || "Профессиональный разбор темы");
  let siteContent = markdownToHtml(extract("CONTENT")) || `<p>${draft}</p>`;
  let telegramTitle = stripResidualMarkdown(extract("TG_TITLE") || siteTitle);
  let telegramPost = stripResidualMarkdown(extract("TG_POST").replace(/\[\/?TG_POST\]/g, '').trim());
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

// MAIN PIPELINE
export async function generateArticle(topic: string, cluster?: KeywordCluster): Promise<GenerationResult> {
  const maxAttempts = 3;
  let lastAttemptId = "";
  let currentTopic = topic;
  // Если кластер не передан явно (например, генерация по свободному topic),
  // резолвим его из SEO-словаря: без него PubMed ищет по сырому русскому тексту
  // и гарантированно получает 0 статей.
  let currentCluster = cluster ?? getClusterByKeyword(topic);
  const attemptedTopics = new Set<string>(); // Запоминаем темы, которые уже пробовали

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptId = `attempt-${attempt + 1}`;
    lastAttemptId = attemptId;
    console.log(`[Pipeline] [${attemptId}] Attempt ${attempt + 1}: ${currentTopic}`);

    const pubmedQuery = currentCluster?.pubmedQuery || currentTopic;
    const rawPubmed = await getPubMedArticles(pubmedQuery, 5);
    const crossrefArticles = await searchCrossRef(pubmedQuery, 3);
    const allArticles = filterEvidenceForAutomaticPublication(currentTopic, [...rawPubmed, ...crossrefArticles].slice(0, 7) as EvidenceItem[]);
    console.log(`[Pipeline] [${attemptId}] Trusted evidence eligible for publication: ${allArticles.length} [${evidenceIds(allArticles)}]`);

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

    const { isSufficient, dossier, reason } = await evaluateEvidence(currentTopic, allArticles, attemptId);

    if (!isSufficient || !dossier) {
      console.log(`[Pipeline] [${attemptId}] PIVOT. Reason: ${reason}.`);
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

    // Title gets two gates: the generic claim validator and the dedicated
    // topic-consistency check (subject survival + audience preservation).
    const combinedTitleValidation = (titleText: string): GeneratedClaimsValidation => {
      const base = validateGeneratedClaims(titleText || "", dossier);
      if (!base.valid) return base;
      return validateTitleAgainstDossier(titleText || "", dossier);
    };

    do {
      console.time(`Pipeline Step 3 (Humanizer Attempt ${humanizerAttempts + 1})`);
      versions = await humanizeDraft(draft, dossier, previousHumanizerFailure);
      console.timeEnd(`Pipeline Step 3 (Humanizer Attempt ${humanizerAttempts + 1})`);

      const withField = (v: GeneratedClaimsValidation, field: string): GeneratedClaimsValidation =>
        v.valid ? v : { ...v, reason: `${field}: ${v.reason}` };
      titleValidation = withField(combinedTitleValidation(versions.siteTitle || ""), "title");
      excerptValidation = withField(validateGeneratedClaims(versions.siteExcerpt || "", dossier), "excerpt");
      const contentBase = withField(validateGeneratedClaims(versions.siteContent || "", dossier), "content");
      // Quantitative gate MUST see the cleaned copy: validateGeneratedClaims
      // strips the model-emitted bibliography tail and [n] markers, while the
      // gate previously received the RAW string - years inside the tail
      // satisfied /\d/ and defeated the gate, while the saved article carried
      // zero figures from the meta-analysis (production E2E,
      // draft-1790100173338). Gate the copy that will actually be saved.
      validation = contentBase.valid ? withField(validateQuantitativeCoverage(contentBase.text || "", dossier), "content") : contentBase;
      telegramValidation = withField(validateGeneratedClaims(versions.telegramPost || "", dossier), "telegramPost");
      if (!titleValidation.valid || !excerptValidation.valid || !validation.valid || !telegramValidation.valid) {
        // Aggregate EVERY failed field: feeding back only the first reason lets
        // the model fix one field and regress another (observed whack-a-mole:
        // excerpt -> content -> excerpt again across three attempts).
        previousHumanizerFailure = [
          titleValidation, excerptValidation, validation, telegramValidation,
        ].filter((v) => !v.valid).map((v) => v.reason).join("; ");
        console.warn(`[Pipeline] [${attemptId}] Humanizer validation failed (Attempt ${humanizerAttempts + 1}): ${previousHumanizerFailure}`);
      }
      humanizerAttempts++;
    } while ((!titleValidation.valid || !excerptValidation.valid || !validation.valid || !telegramValidation.valid) && humanizerAttempts < maxHumanizerAttempts);

    if (!titleValidation.valid || !excerptValidation.valid || !validation.valid || !telegramValidation.valid) {
      // Evidence Contract: a Humanizer result that failed validation is
      // rejected, never substituted with generated filler. PIVOT to another
      // evidence-eligible topic instead of publishing an angle-less shell.
      console.warn(`[Pipeline] [${attemptId}] Humanizer failed after max attempts (${previousHumanizerFailure ?? "unknown reason"}); PIVOT.`);
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

  console.log(`[Pipeline] Failed to find sufficient evidence after max attempts${lastAttemptId ? ` (last: ${lastAttemptId})` : ""}. No draft created.`);
  return { status: "no_suitable_topic" };
}

// Validates a source URL before it reaches public HTML: deterministically
// unwraps a markdown wrapper ([url](url) -> url) and accepts only http(s)
// URLs free of brackets. Returns null when the URL cannot be safely embedded
// in an href (broken href="[url](url)" was observed in production).
export function normalizeSourceUrl(raw: string): string | null {
  let url = (raw || "").trim();
  const md = url.match(/^\[?\s*(https?:\/\/[^\s\]]+?)\s*\]?\s*\(\s*(https?:\/\/[^\s)]+?)\s*\)$/);
  if (md) url = md[1];
  if (/[\[\]]/.test(url)) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function generateSourcesBlock(articles: EvidenceItem[]): string {
  if (articles.length === 0) return "";
  const items = articles.map(a => {
    // Экранируем HTML в данных источника
    const safeTitle = a.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeJournal = (a.journal || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeUrl = normalizeSourceUrl(a.url);
    if (!safeUrl) {
      // Evidence Contract: a URL carrying markdown residue or a non-http(s)
      // scheme must not reach public HTML. Drop the entry loudly.
      console.error(`[Sources] Invalid source URL for PMID ${a.pmid || "?"}: "${a.url}" — entry dropped`);
      return "";
    }
    return `<li><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeTitle}</a> — ${safeJournal}, ${a.pubDate}</li>`;
  }).filter(Boolean);
  if (items.length === 0) return "";
  return `\n<h2>Источники</h2>\n<ul>${items.join("")}</ul>`;
}

export async function generateArticleByKeyword(keyword: string): Promise<GenerationResult> {
  const cluster = getClusterByKeyword(keyword);
  return generateArticle(keyword, cluster);
}
