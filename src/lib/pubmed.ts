// src/lib/pubmed.ts
// Парсер научных статей из PubMed через E-utilities API

export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  pubDate: string;
  url: string;
}

interface ESearchResult {
  esearchresult: {
    idlist: string[];
  };
}

// Поиск статей по запросу
export async function searchPubMed(query: string, maxResults: number = 5): Promise<string[]> {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PubMed esearch failed: ${res.status}`);
  }

  const data: ESearchResult = await res.json();
  return data.esearchresult.idlist || [];
}

// Получение деталей статей по PMID
export async function fetchArticles(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];

  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(",")}&rettype=abstract&retmode=xml`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PubMed efetch failed: ${res.status}`);
  }

  const xml = await res.text();
  return parseArticlesXml(xml);
}

// Парсер XML: разбивает на отдельные <PubmedArticle> блоки, затем извлекает данные
export function parseArticlesXml(xml: string, pmids?: string[]): PubMedArticle[] {
  const articles: PubMedArticle[] = [];

  // Разбиваем XML на отдельные блоки <PubmedArticle>...</PubmedArticle>
  // Используем нежадный match для каждого блока
  const articleBlocks = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];

  for (const block of articleBlocks) {
    const article = parseSingleArticle(block);
    if (article) {
      articles.push(article);
    }
  }

  // Если переданы PMID и какие-то не нашли — создаём заглушки
  if (pmids) {
    for (const pmid of pmids) {
      if (!articles.find(a => a.pmid === pmid)) {
        articles.push({
          pmid,
          title: `PubMed Article ${pmid}`,
          abstract: "",
          authors: [],
          journal: "",
          pubDate: "",
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        });
      }
    }
  }

  return articles;
}

// Парсинг ОДНОГО блока <PubmedArticle>
function parseSingleArticle(block: string): PubMedArticle | null {
  // Извлекаем PMID — берём ПЕРВЫЙ <PMID> в блоке (он основной)
  const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
  if (!pmidMatch) return null;
  const pmid = pmidMatch[1];

  // Title
  const titleMatch = block.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "Без названия";

  // Abstract — может быть несколько <AbstractText> блоков
  const abstractParts: string[] = [];
  const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
  let abstractMatch;
  while ((abstractMatch = abstractRegex.exec(block)) !== null) {
    abstractParts.push(abstractMatch[1].replace(/<[^>]+>/g, "").trim());
  }
  const abstract = abstractParts.join("\n\n");

  // Journal
  const journalMatch = block.match(/<Title>([\s\S]*?)<\/Title>/);
  const journal = journalMatch ? journalMatch[1].trim() : "";

  // PubDate
  const pubDateMatch = block.match(/<PubDate>([\s\S]*?)<\/PubDate>/);
  const pubDate = pubDateMatch ? pubDateMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  // Authors
  const authors: string[] = [];
  const authorRegex = /<Author[^>]*>[\s\S]*?<LastName>(.*?)<\/LastName>[\s\S]*?<ForeName>(.*?)<\/ForeName>[\s\S]*?<\/Author>/g;
  let authorMatch;
  while ((authorMatch = authorRegex.exec(block)) !== null) {
    authors.push(`${authorMatch[2]} ${authorMatch[1]}`);
  }

  return {
    pmid,
    title,
    abstract,
    authors: authors.slice(0, 5),
    journal,
    pubDate,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  };
}

// Главная функция: поиск + получение статей
export async function getPubMedArticles(query: string, maxResults: number = 5): Promise<PubMedArticle[]> {
  try {
    const pmids = await searchPubMed(query, maxResults);
    if (pmids.length === 0) {
      console.log(`PubMed: нет статей по запросу "${query}"`);
      return [];
    }

    const articles = await fetchArticles(pmids);
    console.log(`PubMed: найдено ${articles.length} статей по запросу "${query}"`);
    return articles;
  } catch (error) {
    console.error("PubMed error:", error);
    return [];
  }
}
