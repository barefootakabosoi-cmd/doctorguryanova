import { describe, it, expect, vi } from "vitest";
import { generateArticle } from "../src/lib/content-pipeline";

// Мокаем GigaChat и парсеры
vi.mock("../src/lib/gigachat", () => ({
  chatCompletion: vi.fn()
    // 1. Оценка доказательств: недостаточно
    .mockResolvedValueOnce({ choices: [{ message: { content: '{"isSufficient": false}' } }] })
    // 2. Оценка доказательств: достаточно
    .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({
      isSufficient: true,
      dossier: { chosenAngle: "Test Angle", keyFacts: ["Fact 1"], whatIsKnown: ["Known"], whatIsNotKnown: ["Unknown"], limitations: ["L1"], safeClaims: ["Claim 1"], confidence: "high" }
    }) } }] })
    // 3. Генерация версий
    .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({
      siteTitle: "Test Title", siteExcerpt: "Excerpt", siteContent: "<p>Content</p>", telegramTitle: "TG Title", telegramPost: "TG Post"
    }) } }] })
}));

vi.mock("../src/lib/pubmed", () => ({ getPubMedArticles: vi.fn().mockResolvedValue([{ title: "Test", journal: "J", pubDate: "2024", abstract: "A", url: "http://test.com" }]) }));
vi.mock("../src/lib/crossref", () => ({ searchCrossRef: vi.fn().mockResolvedValue([]) }));
vi.mock("../src/lib/seo-keywords", () => ({ getRandomCluster: vi.fn().mockReturnValue({ primary: "New Topic", pubmedQuery: "New Query" }), getClusterByKeyword: vi.fn() }));

describe("Research Content Engine v1.1", () => {
  it("should pivot topic if evidence is insufficient (Case 1 & 4)", async () => {
    const result = await generateArticle("Bioregulators");
    // Первый вызов вернет isSufficient: false, система должна сменить тему и попробовать снова
    expect(result.post.title).toBe("Test Title"); // Должна вернуть успешную статью со второй попытки
  });
});
