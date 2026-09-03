export interface SourceArticle {
  pmid?: string;
  doi?: string;
  title: string;
  authors: string[];
  journal: string;
  pubDate: string;
  abstract: string;
  url: string;
  studyType?: string;
  keyFindings?: string[];
  limitations?: string[];
}

export interface ResearchDossier {
  topic: string;
  searchQuery: string;
  articles: SourceArticle[];
  generatedAt: string;
}
