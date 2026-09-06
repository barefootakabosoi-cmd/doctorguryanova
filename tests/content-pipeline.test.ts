import { describe, it, expect, vi } from "vitest";
import { createDossierFromScienceGateResponse, filterEligibleEvidence, generateArticle, maximumClaimStrength, validateGeneratedClaims, evidenceUsedByClaims, markdownToHtml } from "../src/lib/content-pipeline";
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
      topicMatches: true,
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
        safeClaims: [{ text: "Claim 1", strength: "descriptive", evidenceRefs: ["PMID:123"] }],
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


describe("Evidence Contract v5 boundary", () => {
  const mockScienceGatePass = (topic: string) => ({
    choices: [{ message: { content: JSON.stringify({
      topicMatches: true, relevantSources: 1, highQuality: 1, mediumQuality: 0, clinicalCases: 0,
      isSufficient: true, reason: "Relevant", dossier: {
        chosenAngle: topic, keyFacts: ["Fact"], whatIsKnown: ["Known"], whatIsNotKnown: ["Unknown"], limitations: ["Limit"],
        safeClaims: [{ text: "Claim", strength: "descriptive", evidenceRefs: ["PMID:123"] }], confidence: "high",
      },
    }) } }],
  });
  const mockDraft = (text: string) => ({ choices: [{ message: { content: text } }] });
  const mockHumanizer = (content: string) => ({ choices: [{ message: { content: `[CONTENT]\n${content}\n[/CONTENT]` } }] });
  const evidence = [{
    title: "Test", journal: "J", pubDate: "2024", abstract: "A", url: "https://example.test", pmid: "123", sourceType: "rct" as const,
  }];

  it("rejects legacy string safeClaims from the Science Gate", () => {
    const result = createDossierFromScienceGateResponse("Topic", {
      chosenAngle: "Angle", keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [],
      safeClaims: ["A legacy unbound claim"], confidence: "medium",
    }, evidence);
    expect(result.dossier).toBeUndefined();
    expect(result.reason).toMatch(/legacy/);
  });

  it("rejects safe claims pointing to evidence outside the dossier", () => {
    const result = createDossierFromScienceGateResponse("Topic", {
      chosenAngle: "Angle", keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [],
      safeClaims: [{ text: "Claim", strength: "suggestive", evidenceRefs: ["PMID:99999999"] }], confidence: "medium",
    }, evidence);
    expect(result.dossier).toBeUndefined();
    expect(result.reason).toMatch(/evidence/);
  });

  it("preserves HTML content and stores the validated Telegram text", async () => {
    mockChat.mockReset();
    mockChat.mockResolvedValueOnce(mockScienceGatePass("HTML topic"));
    mockChat.mockResolvedValueOnce(mockDraft("Draft"));
    // First Telegram version is rejected; a full humanizer regeneration must follow.
    mockChat.mockResolvedValueOnce(mockHumanizer(`<h2>Что показало исследование</h2><p>Текст.</p>\n[/CONTENT]\n[TG_POST]\nBapat et al. (1998) сообщили о результате. Подробнее на сайте.\n[/TG_POST]`));
    mockChat.mockResolvedValueOnce(mockHumanizer(`<h2>Что показало исследование</h2><p>Текст.</p>\n[/CONTENT]\n[TG_POST]\nКраткий осторожный вывод. Подробнее на сайте.\n[/TG_POST]`));

    const result = await generateArticle("HTML topic");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.content.post.content).toContain("<h2>Что показало исследование</h2>");
      expect(result.content.telegramPost).not.toContain("Bapat");
      expect(result.content.telegramPost).not.toContain("1998");
      expect(result.content.telegramPost).toContain("Краткий осторожный вывод");
      expect(mockChat).toHaveBeenCalledTimes(4);
    }
  });
});


describe("Source eligibility and claim strength", () => {
  const oldStudy = {
    title: "Small physiotherapy study", journal: "J", pubDate: "2008", abstract: "A small clinical study.",
    url: "https://example.test/old", pmid: "11111111",
  };
  const modernReview = {
    title: "Modern systematic review", journal: "J", pubDate: "2022", abstract: "Systematic review.",
    url: "https://example.test/review", pmid: "22222222", sourceType: "systematic_review" as const,
  };

  it("drops an unrelated poisoning record and records without an abstract", () => {
    const eligible = filterEligibleEvidence("вегето-сосудистая дистония", [
      oldStudy,
      { title: "Neurologic disorders in acute dichloroethane poisoning", journal: "J", pubDate: "1978", abstract: "Acute poisoning study.", url: "https://example.test/poison", pmid: "33333333" },
      { title: "No abstract", journal: "J", pubDate: "2024", abstract: "", url: "https://example.test/empty", pmid: "44444444" },
    ]);
    expect(eligible).toEqual([oldStudy]);
  });

  it("caps an over-labelled claim to the server evidence ceiling instead of discarding valid evidence", () => {
    expect(maximumClaimStrength(["PMID:11111111"], [oldStudy])).toBe("descriptive");
    const result = createDossierFromScienceGateResponse("Topic", {
      chosenAngle: "Angle", keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [], confidence: "medium",
      safeClaims: [{ text: "Claim", strength: "strong", evidenceRefs: ["PMID:11111111"] }],
    }, [oldStudy]);
    expect(result.dossier).toBeDefined();
    expect(result.dossier?.safeClaims[0].strength).toBe("descriptive");
  });

  it("allows moderate but not strong claims with a modern systematic review", () => {
    expect(maximumClaimStrength(["PMID:22222222"], [modernReview])).toBe("moderate");
    const result = createDossierFromScienceGateResponse("Topic", {
      chosenAngle: "Angle", keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [], confidence: "medium",
      safeClaims: [{ text: "Careful claim", strength: "moderate", evidenceRefs: ["PMID:22222222"] }],
    }, [modernReview]);
    expect(result.dossier).toBeDefined();
  });

  it("rejects promotional effectiveness claims but permits neutral limitation language", () => {
    const dossier = {
      topic: "Topic", chosenAngle: "Angle", keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [], confidence: "low" as const,
      safeClaims: [{ text: "Careful claim", strength: "descriptive" as const, evidenceRefs: ["PMID:11111111"] }],
      evidence: [oldStudy],
    };
    expect(validateGeneratedClaims("<p>Это эффективный метод лечения.</p>", dossier).valid).toBe(false);
    expect(validateGeneratedClaims("<p>Эффективность подтверждена.</p>", dossier).valid).toBe(false);
    expect(validateGeneratedClaims("<p>Нужны исследования для оценки эффективности.</p>", dossier).valid).toBe(true);
    expect(validateGeneratedClaims("<p>При неэффективности консервативной терапии врач пересматривает тактику.</p>", dossier).valid).toBe(true);
  });

  it("rejects effectiveness language and only publishes sources used by claims", () => {
    const dossier = {
      topic: "Topic", chosenAngle: "Angle", keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [], confidence: "low" as const,
      safeClaims: [{ text: "Careful claim", strength: "descriptive" as const, evidenceRefs: ["PMID:11111111"] }],
      evidence: [oldStudy, modernReview],
    };
    expect(validateGeneratedClaims("<p>Метод обладает доказанной эффективностью.</p>", dossier).valid).toBe(false);
    expect(evidenceUsedByClaims(dossier)).toEqual([oldStudy]);
  });
});


describe("Humanizer repair loop", () => {
  it("feeds the concrete validator rejection into the next regeneration", async () => {
    mockChat.mockReset();
    const science = { choices: [{ message: { content: JSON.stringify({
      topicMatches: true, highQuality: 1, mediumQuality: 0, clinicalCases: 0, dossier: {
        chosenAngle: "Topic", keyFacts: ["Fact"], whatIsKnown: ["Known"], whatIsNotKnown: ["Unknown"], limitations: ["Limit"],
        safeClaims: [{ text: "Careful claim", strength: "descriptive", evidenceRefs: ["PMID:123"] }], confidence: "low"
      }
    }) } }] };
    mockChat.mockResolvedValueOnce(science);
    mockChat.mockResolvedValueOnce({ choices: [{ message: { content: "Draft" } }] });
    mockChat.mockResolvedValueOnce({ choices: [{ message: { content: "[CONTENT]<p>Это эффективный метод лечения.</p>[/CONTENT]" } }] });
    mockChat.mockResolvedValueOnce({ choices: [{ message: { content: "[CONTENT]<p>Осторожный вывод.</p>[/CONTENT]" } }] });

    const result = await generateArticle("Topic");
    expect(result.status).toBe("success");
    expect(mockChat).toHaveBeenCalledTimes(4);
    const retryPrompt = mockChat.mock.calls[3][0].messages[0].content as string;
    expect(retryPrompt).toContain("ПРЕДЫДУЩАЯ ВЕРСИЯ БЫЛА ОТКЛОНЕНА");
    expect(retryPrompt).toContain("strong effectiveness claim");
  });
});


describe("Markdown conversion", () => {
  it("renders markdown emphasis once instead of wrapping every character", () => {
    const html = markdownToHtml("## Введение\n\n**Важный вывод**");
    expect(html).toContain("<h2>Введение</h2>");
    expect(html).toContain("<strong>Важный вывод</strong>");
    expect(html).not.toContain("<strong>В</strong><strong>а</strong>");
  });

  it("does not reinterpret already-valid HTML as markdown", () => {
    const html = markdownToHtml("<h2>Введение</h2><p>Обычный текст.</p>");
    expect(html).toBe("<h2>Введение</h2><p>Обычный текст.</p>");
  });
});

describe("Public-copy contract", () => {
  const dossier = {
    topic: "Topic", chosenAngle: "Angle", keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [], confidence: "low" as const,
    safeClaims: [{ text: "Careful claim", strength: "descriptive" as const, evidenceRefs: ["PMID:11111111"] }],
    evidence: [{ title: "Study", journal: "J", pubDate: "2024", abstract: "A", url: "https://example.test", pmid: "11111111" }],
  };

  it("rejects internal evidence labels and residual markdown in public output", () => {
    expect(validateGeneratedClaims("<p>[descriptive; PMID:11111111] Текст.</p>", dossier).valid).toBe(false);
    expect(validateGeneratedClaims("<p>*Hirudo medicinalis*</p>", dossier).valid).toBe(false);
  });

  it("renders italics and wraps bare text following a heading", () => {
    const html = markdownToHtml("<h2>Введение</h2>\nТекст о *Hirudo medicinalis*.");
    expect(html).toContain("<h2>Введение</h2>");
    expect(html).toContain("<p>Текст о <em>Hirudo medicinalis</em>.</p>");
  });
});
