import { describe, it, expect, vi } from "vitest";
import { validateGeneratedClaims, validateTitleAgainstDossier, generateSourcesBlock, normalizeSourceUrl } from "../src/lib/content-pipeline";
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
