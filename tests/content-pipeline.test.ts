import { describe, it, expect, vi } from "vitest";
import { generateArticle } from "../src/lib/content-pipeline";

vi.mock("../src/lib/gigachat", () => ({
  chatCompletion: vi.fn()
    .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({
      interventionMatches: false,
      relevantSources: 2,
      highQuality: 0,
      mediumQuality: 2,
      clinicalCases: 0,
      isSufficient: false,
      reason: "Sources are about manual therapy, not bioregulators"
    }) } }] })
    .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({
      interventionMatches: true,
      relevantSources: 3,
      highQuality: 1,
      mediumQuality: 0,
      clinicalCases: 0,
      isSufficient: true,
      reason: "Relevant RCT found",
      dossier: { chosenAngle: "Test Angle", keyFacts: ["Fact 1"], whatIsKnown: ["Known"], whatIsNotKnown: ["Unknown"], limitations: ["L1"], safeClaims: ["Claim 1"], confidence: "high" }
    }) } }] })
    .mockResolvedValueOnce({ choices: [{ message: { content: 
      "[TITLE]\nTest Title\n[/TITLE]\n\n[EXCERPT]\nTest Excerpt\n[/EXCERPT]\n\n[CONTENT]\n<p>Test Content</p>\n[/CONTENT]\n\n[TG_TITLE]\nTG Title\n[/TG_TITLE]\n\n[TG_POST]\nTG Post\n[/TG_POST]"
    } }] })
}));

vi.mock("../src/lib/pubmed", () => ({ getPubMedArticles: vi.fn().mockResolvedValue([{ title: "Test", journal: "J", pubDate: "2024", abstract: "A", url: "http://test.com" }]) }));
vi.mock("../src/lib/crossref", () => ({ searchCrossRef: vi.fn().mockResolvedValue([]) }));
vi.mock("../src/lib/seo-keywords", () => ({ getRandomCluster: vi.fn().mockReturnValue({ primary: "New Topic", pubmedQuery: "New Query" }), getClusterByKeyword: vi.fn() }));

describe("Research Content Engine v1.2 (Strict Gate)", () => {
  it("should pivot if intervention does not match (Bioregulators case)", async () => {
    const result = await generateArticle("Bioregulators");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.content.post.title).toBe("Test Title");
      expect(result.content.post.content).toContain("Test Content");
      expect(result.content.telegramPost).toBe("TG Post");
    }
  });
});
