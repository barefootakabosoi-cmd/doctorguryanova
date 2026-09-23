import { describe, it, expect, vi } from "vitest";
import { validateGeneratedClaims, normalizeModelClosingTags, validateTitleAgainstDossier, generateSourcesBlock, normalizeSourceUrl, normalizeMarkdownHeadings } from "../src/lib/content-pipeline";
import { ResearchDossier, EvidenceItem, ClaimStrength } from "../src/lib/research-dossier";

vi.mock("sanitize-html", () => {
  const sanitize = (str: string) => str;
  (sanitize as any).simpleTransform = () => () => ({ tagName: "a", attribs: {} });
  return { default: sanitize };
});

const ev = (url: string): EvidenceItem => ({
  title: "Study", authors: [], journal: "J", pubDate: "2023Nov",
  abstract: "Activity pacing reduced fatigue (Hedges g -0.52, 95% CI -0.73 to -0.32; 14 RCTs).",
  url, pmid: "36345726", sourceType: "systematic_review"
});

const dossier = (strength: ClaimStrength): ResearchDossier => ({
  topic: "синдром хронической усталости",
  chosenAngle: "планирование активности при синдроме хронической усталости",
  evidence: [ev("https://pubmed.ncbi.nlm.nih.gov/36345726/")],
  keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [],
  safeClaims: [{ text: "Пейсинг активности снижал усталость в исследованиях", strength, evidenceRefs: ["PMID:36345726"] }],
  confidence: "high"
});

describe("Amplifier gates (moderate dossier)", () => {
  it("rejects consensus phrasing ('признается эффективным способом')", () => {
    const v = validateGeneratedClaims("<p>Пейсинг признается эффективным способом уменьшения симптомов.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("consensus effectiveness phrasing");
  });

  it("rejects 'эффективный метод лечения <нозология>' generalization at moderate", () => {
    const v = validateGeneratedClaims("<p>Пейсинг является эффективным методом лечения синдрома хронической усталости.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("treatment-method generalization");
  });

  it("rejects 'действенный способ борьбы' at moderate", () => {
    const v = validateGeneratedClaims("<p>Это один из действенных способов борьбы с состоянием.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
  });

  it("allows careful study-result wording at moderate", () => {
    const v = validateGeneratedClaims("<p>В исследовании показано снижение усталости.</p>", dossier("moderate"));
    expect(v.valid).toBe(true);
  });

  it("rejects bare 'эффективный способ' at descriptive", () => {
    const v = validateGeneratedClaims("<p>Это эффективный способ.</p>", dossier("descriptive"));
    expect(v.valid).toBe(false);
  });

  it("rejects universal applicability promise", () => {
    const v = validateGeneratedClaims("<p>Пейсинг подходит всем пациентам.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("universal patient applicability");
  });

  it("allows negated applicability ('не подходит всем')", () => {
    const v = validateGeneratedClaims("<p>Этот режим не подходит всем пациентам.</p>", dossier("moderate"));
    expect(v.valid).toBe(true);
  });

  it("rejects model-generated links in content", () => {
    const v = validateGeneratedClaims('<p>Подробнее: <a href="https://pubmed.ncbi.nlm.nih.gov/36345726/">x</a></p>', dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("Model-generated link");
  });
});

describe("Title promise gate", () => {
  it("rejects outcome-promising title", () => {
    const v = validateTitleAgainstDossier("Планирование активности помогает справиться с хронической усталостью", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("promises an outcome");
  });

  it("allows descriptive research title", () => {
    const v = validateTitleAgainstDossier("Что показали исследования о планировании активности при хронической усталости", dossier("moderate"));
    expect(v.valid).toBe(true);
  });
});

describe("Source URL hygiene", () => {
  it("unwraps markdown-wrapped PubMed URL", () => {
    const html = generateSourcesBlock([ev("[https://pubmed.ncbi.nlm.nih.gov/36345726/](https://pubmed.ncbi.nlm.nih.gov/36345726/)")]);
    expect(html).toContain('href="https://pubmed.ncbi.nlm.nih.gov/36345726/"');
    expect(html).not.toContain("](");
  });

  it("drops entries with unusable URLs", () => {
    expect(generateSourcesBlock([ev("javascript:alert(1)")])).toBe("");
    expect(generateSourcesBlock([ev("not a url at all")])).toBe("");
  });

  it("keeps clean URLs and preserves http(s) only", () => {
    expect(generateSourcesBlock([ev("https://pubmed.ncbi.nlm.nih.gov/36345726/")])).toContain("36345726");
    expect(normalizeSourceUrl("ftp://x")).toBe(null);
    expect(normalizeSourceUrl("https://pubmed.ncbi.nlm.nih.gov/36345726/")).toBe("https://pubmed.ncbi.nlm.nih.gov/36345726/");
    expect(normalizeSourceUrl("[https://x](https://x)")).toBe("https://x/");
    expect(normalizeSourceUrl("not-a-url")).toBe(null);
  });
});

describe("Regression: real production draft (draft-1789478092466)", () => {
  const prodTitle = "Планирование активности помогает справиться с хронической усталостью";
  const prodClaims = [
    "<p>Один из действенных способов борьбы с этим состоянием — регулярное планирование физической и когнитивной активности.</p>",
    "<p>Таким образом, активное планирование физической и когнитивной активности признается эффективным способом уменьшения симптомов хронической усталости.</p>",
  ];

  it("title of the production draft is rejected as an outcome promise", () => {
    const v = validateTitleAgainstDossier(prodTitle, dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("promises an outcome");
  });

  it.each(prodClaims)("amplified claim is rejected: %s", (claim) => {
    const v = validateGeneratedClaims(claim, dossier("moderate"));
    expect(v.valid).toBe(false);
  });

  it("safeClaim wording ('эффективный метод лечения') is rejected", () => {
    const v = validateGeneratedClaims("<p>Пейсинг является эффективным методом лечения синдрома хронической усталости.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("treatment-method generalization");
  });

  it("evidence-attributed outcome statement passes (faithful restatement of the meta-analysis result)", () => {
    const v = validateGeneratedClaims(
      "<p>Согласно результатам систематического обзора и метаанализа, структурированный режим занятий эффективно уменьшает проявления хронической усталости.</p>",
      dossier("moderate")
    );
    expect(v.valid).toBe(true);
  });

  it("present-tense outcome statement passes (no method/universalization wording)", () => {
    const v = validateGeneratedClaims("<p>Активное планирование эффективно уменьшает проявления хронической усталости.</p>", dossier("moderate"));
    expect(v.valid).toBe(true);
  });

  it("careful rewording of the same facts passes", () => {
    const v = validateGeneratedClaims(
      "<p>В систематическом обзоре 14 рандомизированных исследований планирование активности снижало выраженность усталости по сравнению с отсутствием лечения.</p>",
      dossier("moderate")
    );
    expect(v.valid).toBe(true);
  });
});

import { createDossierFromScienceGateResponse, validateQuantitativeCoverage } from "../src/lib/content-pipeline";

const quantEvidence = [{ pmid: "36345726", doi: "", title: "T", abstract: "A", authors: [], journal: "J", pubDate: "2023Nov", url: "https://pubmed.ncbi.nlm.nih.gov/36345726/", sourceType: "systematic_review" }] as any;
const rawDossier = (claims: any[], extra: Record<string, unknown> = {}) => ({
  chosenAngle: "пейсинг активности при синдроме хронической усталости",
  keyFacts: ["факт"], whatIsKnown: ["известно"], whatIsNotKnown: ["неизвестно"], limitations: ["ограничение"],
  safeClaims: claims, confidence: "high", ...extra,
});

describe("Dossier admission gate", () => {
  it("rejects treatment-method generalization in safeClaim text even at moderate", () => {
    const r = createDossierFromScienceGateResponse("синдром хронической усталости", rawDossier([
      { text: "Пейсинг является эффективным методом лечения синдрома хронической усталости", strength: "moderate", evidenceRefs: ["PMID:36345726"] },
    ]), quantEvidence);
    expect(r.reason).toContain("safe claim text rejected");
    expect(r.reason).toContain("treatment-method generalization");
  });

  it("parses and passes cautions through", () => {
    const r = createDossierFromScienceGateResponse("синдром хронической усталости", rawDossier([
      { text: "Пейсинг снижал усталость в исследованиях", strength: "moderate", evidenceRefs: ["PMID:36345726"] },
    ], { cautions: ["ухудшение состояния после нагрузки"] }), quantEvidence);
    expect(r.dossier?.cautions).toEqual(["ухудшение состояния после нагрузки"]);
  });

  it("backward-compatible: dossier without cautions gets empty list", () => {
    const r = createDossierFromScienceGateResponse("синдром хронической усталости", rawDossier([
      { text: "Пейсинг снижал усталость в исследованиях", strength: "moderate", evidenceRefs: ["PMID:36345726"] },
    ]), quantEvidence);
    expect(r.dossier?.cautions).toEqual([]);
  });
});

describe("Load-increase imperative gate", () => {
  it("rejects prescriptive load increase", () => {
    const v = validateGeneratedClaims("<p>Постепенно увеличивайте физическую активность.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("load-increase imperative");
  });

  it("allows negated informational form", () => {
    const v = validateGeneratedClaims("<p>Не рекомендуется резко наращивать активность.</p>", dossier("moderate"));
    expect(v.valid).toBe(true);
  });
});

describe("Quantitative coverage for site content", () => {
  it("rejects figure-free article over quantitative evidence", () => {
    const v = validateQuantitativeCoverage("<p>Исследования показали положительный эффект.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("quantitative");
  });

  it("passes when review figures are present", () => {
    const v = validateQuantitativeCoverage("<p>В метаанализе 14 исследований: Hedges g -0.52 (CI -0.73 до -0.32) против отсутствия лечения.</p>", dossier("moderate"));
    expect(v.valid).toBe(true);
  });
});

describe("Quantitative gate: cleaned vs raw input (production bypass regression)", () => {
  // Regression note: production dossier (draft-1790100173338) carried a
  // meta_analysis source; the shared dossier() helper sets no sourceType,
  // so the quantitative gate never armed and valid:false was never reached.
  const quantDossier = () => {
    const d = dossier("moderate");
    (d.evidence[0] as unknown as Record<string, unknown>).sourceType = "meta_analysis";
    return d;
  };

  const RAW_FIGURE_FREE = "<h2>Введение</h2><p>Состояние описано в общем виде.</p><h2>Источники</h2><ul><li>Журнал, 2022Nov21</li></ul>";

  it("gate runs on CLEANED copy: years in raw sources tail no longer satisfy it", () => {
    const claims = validateGeneratedClaims(RAW_FIGURE_FREE, dossier("moderate"));
    expect(claims.valid).toBe(true);
    const gate = validateQuantitativeCoverage(claims.text || "", quantDossier());
    expect(gate.valid).toBe(false);
    expect(gate.reason).toBeTruthy();
  });

  it("gate passes cleaned copy that carries evidence figures", () => {
    const raw = "<p>Метаанализ 14 исследований: эффект g -0.52 (95% CI -0.73..-0.32) против отсутствия лечения.</p>";
    const claims = validateGeneratedClaims(raw, dossier("moderate"));
    expect(claims.valid).toBe(true);
    const gate = validateQuantitativeCoverage(claims.text || raw, quantDossier());
    expect(gate.valid).toBe(true);
  });
});

describe("Model tag normalization + groundedness prompt", () => {
  it("normalizes mis-slashed closing tags and rescues CONTENT", () => {
    const raw = "[CONTENT]<h2>Введение</h2><p>Текст.</p>/[CONTENT][TG_POST]Суть. Подробнее:[/TG_POST]";
    expect(normalizeModelClosingTags(raw)).toContain("[/CONTENT]");
    expect(normalizeModelClosingTags(raw)).not.toContain("/[CONTENT]");
    // rescued: extract() can now find the closing tag
    const m = normalizeModelClosingTags(raw).match(/\[CONTENT\]([\s\S]*?)\[\/CONTENT\]/i);
    expect(m ? m[1] : "").toContain("<h2>Введение</h2>");
  });

  it("does not touch already-correct tags", () => {
    expect(normalizeModelClosingTags("[/TG_POST]")).toBe("[/TG_POST]");
    expect(normalizeModelClosingTags("путь /п/home")).toBe("путь /п/home"); // non-tag slash preserved
  });
});

describe("Markdown heading normalization before validation", () => {
  it("converts ### headings so content is not rejected (local E2E regression)", () => {
    const raw = "### Как проявляется\n<p>В исследовании показано снижение усталости.</p>";
    const v = validateGeneratedClaims(normalizeMarkdownHeadings(raw), dossier("moderate"));
    expect(v.valid).toBe(true);
    expect(v.text).toContain("<h2>Как проявляется</h2>");
  });

  it("backstop intact: ** bold markdown still rejected after normalization", () => {
    const v = validateGeneratedClaims(normalizeMarkdownHeadings("<p>Это **жирный** текст.</p>"), dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("Markdown leaked");
  });

  it("single # heading converts to h2", () => {
    expect(normalizeMarkdownHeadings("# Заголовок")).toContain("<h2>Заголовок</h2>");
  });
});

describe("Amplifier feedback precision", () => {
  it("rejection reason quotes the offending fragment (actionable retry feedback)", () => {
    const v = validateGeneratedClaims("<p>Пейсинг является эффективным методом лечения синдрома хронической усталости.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("treatment-method generalization");
    expect(v.reason).toContain("эффективным методом лечения");
  });
});

describe("Clinical-caution grounding (production regression draft-1790183786671)", () => {
  it("rejects a fabricated caution section when dossier.cautions is empty", () => {
    const v = validateGeneratedClaims("<h2>Клинические предостережения</h2><p>Перед началом занятий состояние оценивается в общем порядке.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("Fabricated clinical caution");
  });

  it("rejects the prescriptive consultation phrase without any caution section", () => {
    const v = validateGeneratedClaims("<p>Начинать занятия следует исключительно после консультации врача, который оценит риски.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("Fabricated clinical caution");
  });

  it("rejects the exact production evasion: modal + консультация специалиста", () => {
    const v = validateGeneratedClaims("<p>Однако перед началом любых изменений в режиме физической активности необходима консультация специалиста.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("Fabricated clinical caution");
  });

  it("does not reject the bare word врач in a legitimate descriptive context", () => {
    const v = validateGeneratedClaims("<p>Авторы отмечают, что вмешательство не оценивало роль лечащего врача.</p>", dossier("moderate"));
    expect(v.valid).toBe(true);
  });

  it("allows a caution section when the dossier carries cautions", () => {
    const d = { ...dossier("moderate"), cautions: ["ухудшение состояния после нагрузки"] };
    const v = validateGeneratedClaims("<h2>Клинические предостережения</h2><p>При ухудшении состояния после нагрузки активность подбирается индивидуально.</p>", d);
    expect(v.valid).toBe(true);
  });
});

describe("Measured-outcome terminology and universalization", () => {
  const distressDossier = {
    ...dossier("moderate"),
    safeClaims: [{ text: "Пейсинг активности снижал усталость и психологический дистресс в исследованиях", strength: "moderate" as ClaimStrength, evidenceRefs: ["PMID:36345726"] }],
  };

  it("rejects colloquial remapping of a measured outcome", () => {
    const v = validateGeneratedClaims("<p>Программы способствовали снижению усталости и эмоционального напряжения.</p>", distressDossier);
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("Measured outcome remapped");
  });

  it("passes when the article preserves the source terminology", () => {
    const v = validateGeneratedClaims("<p>Программы способствовали снижению усталости и психологического дистресса.</p>", distressDossier);
    expect(v.valid).toBe(true);
  });

  it("rejects universal physical-activity recommendation for a pacing dossier", () => {
    const v = validateGeneratedClaims("<p>Для улучшения состояния пациентам часто рекомендуют физическую активность.</p>", dossier("moderate"));
    expect(v.valid).toBe(false);
    expect(v.reason).toContain("Universal");
  });
});
