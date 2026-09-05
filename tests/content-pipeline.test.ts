import { describe, it, expect, vi } from "vitest";
import { generateArticle } from "../src/lib/content-pipeline";
import { chatCompletion } from "../src/lib/gigachat";

vi.mock("../src/lib/gigachat", () => ({
  chatCompletion: vi.fn()
}));

// Правильный мок sanitize-html с поддержкой simpleTransform
vi.mock("sanitize-html", () => {
  const sanitize = (str: string) => str;
  (sanitize as any).simpleTransform = () => () => ({ tagName: "a", attribs: {} });
  return { default: sanitize };
});

vi.mock("../src/lib/pubmed", () => ({
  getPubMedArticles: vi.fn().mockResolvedValue([{
    title: "Test",
    journal: "J",
    pubDate: "2024",
    abstract: "A",
    url: "http://test.com",
    pmid: "123",
    sourceType: "rct"
  }])
}));

vi.mock("../src/lib/crossref", () => ({ searchCrossRef: vi.fn().mockResolvedValue([]) }));
vi.mock("../src/lib/seo-keywords", () => ({
  getRandomCluster: vi.fn().mockReturnValue({ primary: "New Topic", pubmedQuery: "New Query" }),
  getClusterByKeyword: vi.fn()
}));

const mockChat = vi.mocked(chatCompletion);

describe("Pipeline Evidence-Locked v4", () => {

  const mockScienceGatePass = (topic: string) => ({
    choices: [{ message: { content: JSON.stringify({
      interventionMatches: true,
      relevantSources: 3,
      highQuality: 1,
      mediumQuality: 0,
      clinicalCases: 0,
      isSufficient: true,
      reason: "Relevant RCT found",
      dossier: {
        chosenAngle: topic,
        keyFacts: ["Fact 1"],
        whatIsKnown: ["Known"],
        whatIsNotKnown: ["Unknown"],
        limitations: ["L1"],
        safeClaims: [{ text: "Claim 1", strength: "descriptive", evidenceRefs: ["123"] }],
        confidence: "high"
      }
    }) } }]
  });

  const mockDraft = (text: string) => ({ choices: [{ message: { content: text } }] });
  const mockHumanizer = (content: string) => ({ choices: [{ message: { content: `[CONTENT]\n${content}\n[/CONTENT]` } }] });

  it("Test 1: FAIL -> Regeneration -> PASS", async () => {
    mockChat.mockReset();
    mockChat.mockResolvedValueOnce(mockScienceGatePass("Test Topic 1"));
    mockChat.mockResolvedValueOnce(mockDraft("Draft 1"));
    mockChat.mockResolvedValueOnce(mockHumanizer("<p>Эффективность подтверждена.</p>"));
    mockChat.mockResolvedValueOnce(mockHumanizer("<p>Это безопасный вывод.</p>"));

    const result = await generateArticle("Initial Topic");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.content.post.content).not.toContain("подтверждена");
      expect(result.content.post.content).toContain("безопасный вывод");
    }
    expect(mockChat).toHaveBeenCalledTimes(4);
  });

  it("Test 2: FAIL x3 -> PIVOT -> PASS", async () => {
    mockChat.mockReset();
    // Topic 1
    mockChat.mockResolvedValueOnce(mockScienceGatePass("Test Topic 1"));
    mockChat.mockResolvedValueOnce(mockDraft("Draft 1"));
    mockChat.mockResolvedValueOnce(mockHumanizer("<p>Эффективность подтверждена.</p>"));
    mockChat.mockResolvedValueOnce(mockHumanizer("<p>Это доказано.</p>"));
    mockChat.mockResolvedValueOnce(mockHumanizer("<p>Гарантирует выздоровление.</p>"));

    // Topic 2 (PIVOT)
    mockChat.mockResolvedValueOnce(mockScienceGatePass("New Topic"));
    mockChat.mockResolvedValueOnce(mockDraft("Draft 2"));
    mockChat.mockResolvedValueOnce(mockHumanizer("<p>Это безопасно.</p>"));

    const result = await generateArticle("Initial Topic");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.content.post.content).not.toContain("доказано");
      expect(result.content.post.content).not.toContain("подтверждена");
      expect(result.content.post.content).not.toContain("Гарантирует");
      expect(result.content.post.content).toContain("безопасно");
    }
    expect(mockChat).toHaveBeenCalledTimes(8);
  });
});
