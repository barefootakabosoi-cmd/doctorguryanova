import { describe, it, expect, vi } from "vitest";
import { createDossierFromScienceGateResponse, filterEligibleEvidence, filterEvidenceForAutomaticPublication, generateArticle, maximumClaimStrength, validateGeneratedClaims, validateTitleAgainstDossier, evidenceUsedByClaims, markdownToHtml } from "../src/lib/content-pipeline";
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

  it("Test 2: FAIL x3 -> conservative fallback", async () => {
    mockChat.mockReset();
    // Topic 1
    mockChat.mockResolvedValueOnce(mockScienceGatePass("Test Topic 1"));
    mockChat.mockResolvedValueOnce(mockDraft("Draft 1"));
    mockChat.mockResolvedValueOnce(mockHumanizer("<p>Эффективность подтверждена.</p>"));
    mockChat.mockResolvedValueOnce(mockHumanizer("<p>Это доказано.</p>"));
    mockChat.mockResolvedValueOnce(mockHumanizer("<p>Гарантирует выздоровление.</p>"));

    const result = await generateArticle("Initial Topic");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.content.post.content).not.toContain("доказано");
      expect(result.content.post.content).not.toContain("подтверждена");
      expect(result.content.post.content).not.toContain("Гарантирует");
      expect(result.content.post.content).toContain("О чём этот обзор");
      expect(result.content.post.content).toContain("Как интерпретировать данные");
      expect(result.content.post.content).not.toContain("безопасно");
    }
    expect(mockChat).toHaveBeenCalledTimes(5);
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

  it("excludes clinical cases, author-branded methods, and unsupported products before the Science Gate", () => {
    const independentReview = {
      title: "Systematic review of conservative care for neck pain", journal: "J", pubDate: "2023",
      abstract: "A systematic review of independent trials.", url: "https://example.test/review", pmid: "55555555", sourceType: "systematic_review" as const,
    };
    const rejected = [
      { title: "Clinical case: cervical pain", journal: "J", pubDate: "2024", abstract: "Single clinical case.", url: "https://example.test/case", pmid: "66666666", sourceType: "clinical_case" as const },
      { title: "Author's original method for cervical osteochondrosis", journal: "J", pubDate: "2024", abstract: "An author's original method lowered blood pressure.", url: "https://example.test/method", pmid: "77777777" },
      { title: "Bioregulatory drugs for cervical pain", journal: "J", pubDate: "2025", abstract: "Traumeel S and Zeel T in one patient.", url: "https://example.test/product", doi: "10.1/product" },
      oldStudy,
    ];

    expect(filterEligibleEvidence("остеохондроз шейного отдела", rejected)).toEqual([oldStudy]);
    expect(filterEvidenceForAutomaticPublication("остеохондроз шейного отдела", [...rejected, independentReview])).toEqual([independentReview]);
    expect(filterEvidenceForAutomaticPublication("остеохондроз шейного отдела", rejected)).toEqual([]);
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

  it("infers a synthesis ceiling from the title when no structured type exists", () => {
    const crossrefLike = {
      title: "Acupuncture for tension-type headache: a systematic review", journal: "J", pubDate: "2021",
      abstract: "Synthesis of trials.", url: "https://example.test/crossref", doi: "10.1/crossref",
    };
    expect(maximumClaimStrength(["DOI:10.1/crossref"], [crossrefLike])).toBe("moderate");
  });

  it("allows moderate but not strong claims with a modern systematic review", () => {
    expect(maximumClaimStrength(["PMID:22222222"], [modernReview])).toBe("moderate");
    const result = createDossierFromScienceGateResponse("Topic", {
      chosenAngle: "Angle", keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [], confidence: "medium",
      safeClaims: [{ text: "Careful claim", strength: "moderate", evidenceRefs: ["PMID:22222222"] }],
    }, [modernReview]);
    expect(result.dossier).toBeDefined();
  });

  it("permits careful clinical wording when the dossier carries a moderate claim, but still bans marketing absolutes", () => {
    const dossier = {
      topic: "Topic", chosenAngle: "Angle", keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [], confidence: "medium" as const,
      safeClaims: [{ text: "Рассматривается как терапия первой линии", strength: "moderate" as const, evidenceRefs: ["PMID:22222222"] }],
      evidence: [modernReview],
    };
    const allowed = validateGeneratedClaims("<p>Когнитивно-поведенческая терапия рассматривается в клинических рекомендациях как терапия первой линии при этом состоянии.</p>", dossier);
    expect(allowed.valid).toBe(true);
    expect(validateGeneratedClaims("<p>Этот подход гарантирует результат.</p>", dossier).valid).toBe(false);
    expect(validateGeneratedClaims("<p>Метод доказан.</p>", dossier).valid).toBe(false);
    expect(validateGeneratedClaims("<p>Это лучший метод лечения.</p>", dossier).valid).toBe(false);
    expect(validateGeneratedClaims("<p>Терапия нормализует сон.</p>", dossier).valid).toBe(false);
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


describe("Evidence grounding: drugs and methods", () => {
  const migraineDossier = {
    topic: "мигрень у женщин", chosenAngle: "новые подходы к лечению мигрени у женщин",
    keyFacts: ["Факт"], whatIsKnown: ["Известно"], whatIsNotKnown: ["Неизвестно"],
    limitations: ["Данных о персонализации терапии у женщин недостаточно"], confidence: "medium" as const,
    safeClaims: [{ text: "CGRP-антагонисты и ласмидитан рассматриваются как новые препараты для лечения мигрени", strength: "moderate" as const, evidenceRefs: ["PMID:34160823"] }],
    evidence: [{ title: "AHS consensus", journal: "J", pubDate: "2021", abstract: "Consensus.", url: "https://example.test", pmid: "34160823" }],
  };

  it("rejects a drug invented from general knowledge and absent from the dossier", () => {
    const result = validateGeneratedClaims("<p>Особое внимание уделено триптанам нового поколения.</p>", migraineDossier);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Unsupported drug\/method mention: триптан/);
  });

  it("allows a drug grounded in the dossier claims", () => {
    const result = validateGeneratedClaims("<p>В исследованиях изучались CGRP-антагонисты и ласмидитан.</p>", migraineDossier);
    expect(result.valid).toBe(true);
  });

  it("does not block generic editorial wording without drug names", () => {
    const result = validateGeneratedClaims("<p>Подходы к терапии обсуждаются с врачом.</p>", migraineDossier);
    expect(result.valid).toBe(true);
  });
});

describe("Title/topic consistency", () => {
  const dossier = {
    topic: "мигрень у женщин", chosenAngle: "новые подходы к лечению мигрени у женщин",
    keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [], confidence: "medium" as const,
    safeClaims: [{ text: "Осторожное утверждение", strength: "descriptive" as const, evidenceRefs: ["PMID:34160823"] }],
    evidence: [{ title: "AHS consensus", journal: "J", pubDate: "2021", abstract: "Consensus.", url: "https://example.test", pmid: "34160823" }],
  };

  it("allows a reformulated title that keeps the subject and the audience", () => {
    expect(validateTitleAgainstDossier("Как меняется лечение мигрени во время беременности", dossier).valid).toBe(true);
    expect(validateTitleAgainstDossier("Новые подходы к лечению мигрени у женщин", dossier).valid).toBe(true);
  });

  it("rejects a title that switches the population group", () => {
    const result = validateTitleAgainstDossier("Новые рекомендации по лечению мигрени у взрослых пациентов", dossier);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/audience drift: women -> adults/);
  });

  it("rejects a title that loses the dossier subject", () => {
    const result = validateTitleAgainstDossier("Новые методы терапии головной боли напряжения", dossier);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/drifts away from the dossier subject/);
  });
});

describe("Attempt tagging and evidence trace in logs", () => {
  const gatePass = (topic: string) => ({
    choices: [{ message: { content: JSON.stringify({
      topicMatches: true, relevantSources: 1, highQuality: 1, mediumQuality: 0, clinicalCases: 0,
      isSufficient: true, reason: "Relevant RCT found",
      dossier: {
        chosenAngle: topic, keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [],
        safeClaims: [{ text: "Claim 1", strength: "descriptive", evidenceRefs: ["PMID:123"] }],
        confidence: "high",
      },
    }) } }],
  });
  const draftText = (t: string) => ({ choices: [{ message: { content: t } }] });
  const humanized = (c: string) => ({ choices: [{ message: { content: `[CONTENT]\n${c}\n[/CONTENT]` } }] });
  it("separates pipeline attempts in logs so evidence cannot be mixed visually", async () => {
    mockChat.mockReset();
    mockChat.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({
      topicMatches: false, relevantSources: 1, highQuality: 0, mediumQuality: 2, clinicalCases: 0,
      isSufficient: true, reason: "Off-topic sources", dossier: null,
    }) } }] });
    mockChat.mockResolvedValueOnce(gatePass("Second Topic"));
    mockChat.mockResolvedValueOnce(draftText("Draft"));
    mockChat.mockResolvedValueOnce(humanized("<p>Спокойный осторожный вывод.</p>"));

    const lines: string[] = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => { lines.push(args.join(" ")); });
    try {
      const result = await generateArticle("Initial Topic");
      expect(result.status).toBe("success");
    } finally {
      logSpy.mockRestore();
    }
    const log = lines.join("\n");
    expect(log).toContain("[attempt-1] PIVOT");
    expect(log).toMatch(/\[attempt-2\] Attempt 2/);
    expect(log).toMatch(/\[attempt-2\] Trusted evidence eligible for publication: \d+ \[/);
  });

  it("logs the evidence inventory vs cited refs when a dossier is accepted", () => {
    const evidence = [
      { title: "A", journal: "J", pubDate: "2024", abstract: "A", url: "https://example.test/a", pmid: "11111111" },
      { title: "B", journal: "J", pubDate: "2024", abstract: "B", url: "https://example.test/b", doi: "10.1/b" },
    ];
    const lines: string[] = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => { lines.push(args.join(" ")); });
    const result = createDossierFromScienceGateResponse("Topic", {
      chosenAngle: "Angle", keyFacts: [], whatIsKnown: [], whatIsNotKnown: [], limitations: [], confidence: "medium",
      safeClaims: [{ text: "Claim", strength: "descriptive", evidenceRefs: ["PMID:11111111"] }],
    }, evidence, "attempt-2");
    logSpy.mockRestore();

    expect(result.dossier).toBeDefined();
    const log = lines.join("\n");
    expect(log).toContain("[attempt-2] dossier accepted");
    expect(log).toContain("evidence 2 [PMID:11111111, DOI:10.1/b]");
    expect(log).toContain("cited in safeClaims: 1 [PMID:11111111]");
  });

  it("resolves a free-form topic to its SEO cluster so PubMed gets the English query", async () => {
    const { getClusterByKeyword } = await import("../src/lib/seo-keywords");
    vi.mocked(getClusterByKeyword).mockReturnValue({
      primary: "бессонница лечение",
      secondary: [], longtail: [], related: [],
      pubmedQuery: "insomnia treatment non-pharmacological",
    });

    mockChat.mockReset();
    mockChat.mockResolvedValueOnce(gatePass("бессонница лечение"));
    mockChat.mockResolvedValueOnce(draftText("Draft"));
    mockChat.mockResolvedValueOnce(humanized("<p>Осторожный вывод.</p>"));

    const { getPubMedArticles } = await import("../src/lib/pubmed");
    const mockPubmed = vi.mocked(getPubMedArticles);

    const result = await generateArticle("бессонница лечение");
    expect(result.status).toBe("success");
    expect(mockPubmed).toHaveBeenCalledWith("insomnia treatment non-pharmacological", 5);
  });
});
