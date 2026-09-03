export type SourceType = "rct" | "systematic_review" | "meta_analysis" | "cohort" | "observational" | "clinical_case" | "review" | "guideline" | "other";

export interface EvidenceItem {
  title: string;
  authors: string[];
  journal: string;
  pubDate: string;
  abstract: string;
  url: string;
  pmid?: string;
  doi?: string;
  sourceType?: SourceType;
  relevanceScore?: number; // 0-100
  keyFindings?: string[];
}

export interface ResearchDossier {
  topic: string;
  chosenAngle: string;
  evidence: EvidenceItem[];
  keyFacts: string[];
  whatIsKnown: string[];
  whatIsNotKnown: string[];
  limitations: string[];
  safeClaims: string[];
  confidence: "high" | "medium" | "low";
}

export interface GeneratedContent {
  post: any; // BlogPost
  telegramPost: string;
  seo: { title: string; description: string; keywords: string };
  dossier: ResearchDossier;
  sources: EvidenceItem[];
}
