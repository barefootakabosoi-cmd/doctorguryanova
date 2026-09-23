import { describe, it, expect, vi } from "vitest";

vi.mock("sanitize-html", () => {
  const sanitize = (str: string) => str;
  (sanitize as any).simpleTransform = () => () => ({ tagName: "a", attribs: {} });
  return { default: sanitize };
});

import { validateAndCleanOutput } from "../src/lib/content-pipeline";
import { ResearchDossier } from "../src/lib/research-dossier";

const d = { evidence: [{ doi: "10.1000/valid", pmid: "36345726", sourceType: "review" }] } as unknown as ResearchDossier;

describe("Invalid-reference scrubber: regex metacharacter safety", () => {
  it("strips legacy DOI with parentheses without throwing", () => {
    const html = "<p>Обзор: doi 10.1002/(SICI)1097-0142(19960601)12:6</p><p>Содержательный абзац остаётся.</p>";
    let out = "";
    expect(() => { out = validateAndCleanOutput(html, d); }).not.toThrow();
    expect(out).not.toContain("10.1002");
    expect(out).toContain("Содержательный абзац");
  });

  it("strips DOI with unbalanced parentheses without throwing", () => {
    const html = "<p>doi 10.1002/(SICI1097</p><p>Текст.</p>";
    expect(() => validateAndCleanOutput(html, d)).not.toThrow();
  });
});
