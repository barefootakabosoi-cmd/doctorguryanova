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
  return parseArticlesXml(xml, pmids);
}

// Простой парсер XML (без внешних зависимостей)
function parseArticlesXml(xml: string, pmids: string[]): PubMedArticle[] {
  const articles: PubMedArticle[] = [];
  
  for (const pmid of pmids) {
    const articleMatch = xml.match(new RegExp(`<PubmedArticle>.*?${pmid}.*?</PubmedArticle>`, "s"));
    if (!articleMatch) continue;
    
    const articleXml = articleMatch[0];
    
    const title = extractTag(articleXml, "ArticleTitle") || "Без названия";
    const abstract = extractTag(articleXml, "AbstractText") || "";
    const journal = extractTag(articleXml, "Title") || "";
    const pubDate = extractTag(articleXml, "PubDate") || "";
    
    const authors: string[] = [];
    const authorRegex = /<Author>[\s\S]*?<LastName>(.*?)<\/LastName>[\s\S]*?<ForeName>(.*?)<\/ForeName>[\s\S]*?<\/Author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(articleXml)) !== null) {
      authors.push(`${authorMatch[2]} ${authorMatch[1]}`);
    }
    
    articles.push({
      pmid,
      title: title.trim(),
      abstract: abstract.trim(),
      authors: authors.slice(0, 5),
      journal: journal.trim(),
      pubDate: pubDate.trim(),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    });
  }
  
  return articles;
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "s"));
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : null;
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
