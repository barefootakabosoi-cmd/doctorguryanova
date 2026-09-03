import { describe, it, expect } from "vitest";
import { validateAndCleanOutput, generateSourcesBlock } from "../src/lib/content-pipeline";
import { ResearchDossier } from "../src/lib/research-dossier";

describe("Dossier-Only Factual Generation", () => {
  const mockDossier: ResearchDossier = {
    topic: "Test Topic",
    chosenAngle: "Test Angle",
    keyFacts: [],
    whatIsKnown: [],
    whatIsNotKnown: [],
    limitations: [],
    safeClaims: [],
    confidence: "high",
    evidence: [
      { pmid: "111", doi: "", title: "Study A", abstract: "Evidence A", authors: [], journal: "", pubDate: "", url: "http://pubmed/111" },
      { pmid: "222", doi: "10.1234/B", title: "Study B", abstract: "Evidence B", authors: [], journal: "", pubDate: "", url: "http://doi/10.1234/B" }
    ]
  };

  it("should remove hallucinated author 'Иванов И.И.'", () => {
    const text = "<p>Text</p><p>Автор: Иванов И.И., 2023</p>";
    const clean = validateAndCleanOutput(text, mockDossier);
    expect(clean).not.toContain("Иванов И.И.");
    expect(clean).not.toContain("Автор:");
  });

  it("should remove template garbage", () => {
    const text = "<p>Text</p><p>Для получения подробной информации рекомендуем ознакомиться с полным текстом статьи на нашем сайте.</p>";
    const clean = validateAndCleanOutput(text, mockDossier);
    expect(clean).not.toContain("Для получения подробной информации");
  });

  it("should remove external PMIDs and DOIs", () => {
    const text = "<p>Bapat et al. (1998) proved something. PMID: 99999999. Another study DOI: 10.9999/FAKE.</p>";
    const clean = validateAndCleanOutput(text, mockDossier);
    expect(clean).not.toContain("99999999");
    expect(clean).not.toContain("10.9999/FAKE");
    expect(clean).not.toContain("Bapat"); // Предложение удалено целиком
  });

  it("should remove LLM-generated sources section", () => {
    const text = "<p>Text</p><h2>Источники</h2><ul><li>Bad Source</li></ul>";
    const clean = validateAndCleanOutput(text, mockDossier);
    expect(clean).not.toContain("Источники");
    expect(clean).not.toContain("Bad Source");
  });

  it("should generate sources ONLY from dossier.evidence", () => {
    const sourcesHtml = generateSourcesBlock(mockDossier.evidence as any);
    expect(sourcesHtml).toContain("http://pubmed/111");
    expect(sourcesHtml).toContain("http://doi/10.1234/B");
    expect(sourcesHtml).not.toContain("Bad Source");
  });

  it("Hirudotherapy regression test (Bapat & Ivanov)", () => {
    const hirudotherapyDossier: ResearchDossier = {
      ...mockDossier,
      evidence: [
        { pmid: "19325315", doi: "", title: "Leech therapy.", abstract: "", authors: [], journal: "", pubDate: "", url: "http://pubmed/19325315" },
        { pmid: "20920805", doi: "", title: "Medicinal leech therapy", abstract: "", authors: [], journal: "", pubDate: "", url: "http://pubmed/20920805" },
      ]
    };
    const text = `<p>Bapat et al. (1998) showed something. PMID: 9701897.</p><p>Автор: Иванов И.И.</p><p>Для получения подробной информации...</p>`;
    const clean = validateAndCleanOutput(text, hirudotherapyDossier);
    expect(clean).not.toContain("Bapat");
    expect(clean).not.toContain("9701897"); // External PMID
    expect(clean).not.toContain("Иванов И.И.");
    expect(clean).not.toContain("Для получения подробной информации");
  });
});
