import { describe, it, expect } from "vitest";
import { parseArticlesXml } from "../src/lib/pubmed";

// Симулируем XML от PubMed с двумя разными статьями
const mockXml = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID Version="1">33821446</PMID>
      <Article>
        <ArticleTitle>Non-pharmacological Approaches for Management of Insomnia.</ArticleTitle>
        <Abstract>
          <AbstractText>Insomnia is a prevalent sleep problem associated with negative health outcomes.</AbstractText>
        </Abstract>
        <Journal>
          <Title>Neurotherapeutics</Title>
        </Journal>
      </Article>
      <DateCompleted><Year>2021</Year><Month>01</Month></DateCompleted>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">33821446</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
  <PubmedArticle>
    <MedlineCitation>
      <PMID Version="1">31927422</PMID>
      <Article>
        <ArticleTitle>Pharmacological Treatment of Sleep Disorders.</ArticleTitle>
        <Abstract>
          <AbstractText>Pharmacological interventions for sleep disorders include benzodiazepines and melatonin agonists.</AbstractText>
        </Abstract>
        <Journal>
          <Title>Sleep Medicine Reviews</Title>
        </Journal>
      </Article>
      <DateCompleted><Year>2020</Year><Month>01</Month></DateCompleted>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">31927422</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>`;

describe("PubMed Source Integrity", () => {
  it("should parse multiple articles with correct PMID-to-article mapping", () => {
    const articles = parseArticlesXml(mockXml);

    expect(articles.length).toBe(2);

    // Первая статья
    expect(articles[0].pmid).toBe("33821446");
    expect(articles[0].title).toBe("Non-pharmacological Approaches for Management of Insomnia.");
    expect(articles[0].abstract).toContain("prevalent sleep problem");
    expect(articles[0].journal).toBe("Neurotherapeutics");

    // Вторая статья — НЕ должна иметь title/abstract из первой
    expect(articles[1].pmid).toBe("31927422");
    expect(articles[1].title).toBe("Pharmacological Treatment of Sleep Disorders.");
    expect(articles[1].abstract).toContain("benzodiazepines");
    expect(articles[1].journal).toBe("Sleep Medicine Reviews");

    // Проверяем, что URL корректные
    expect(articles[0].url).toBe("https://pubmed.ncbi.nlm.nih.gov/33821446/");
    expect(articles[1].url).toBe("https://pubmed.ncbi.nlm.nih.gov/31927422/");
  });

  it("should handle empty XML gracefully", () => {
    const articles = parseArticlesXml("");
    expect(articles.length).toBe(0);
  });

  it("should handle XML with no PubmedArticle blocks", () => {
    const articles = parseArticlesXml("<xml>no articles here</xml>");
    expect(articles.length).toBe(0);
  });
});
