import { describe, expect, it } from "vitest";
import { appendSection, documentBlocks, insertExtraPage, moveDocumentBlock, normalizeDocument, PAGE_BREAK } from "./document-order";
import { markdownToLatex } from "./document-latex";

describe("document order", () => {
  const doc = "## Introduction\nIntro\n\n## Conclusion\nEnd\n\n## References\nSource";
  it("keeps extra pages before the closing sections and bibliography", () => {
    const result = insertExtraPage(doc, "### Practical example\nNew material", 1);
    expect(documentBlocks(result).map((b) => b.title)).toEqual(["Introduction", "Practical example", "Conclusion", "References"]);
    expect(result).toContain(PAGE_BREAK);
  });
  it("moves an added page while keeping references last", () => {
    const result = moveDocumentBlock(insertExtraPage(doc, "## New page\nNew", 1), 1, 3);
    expect(documentBlocks(result).map((b) => b.title)).toEqual(["Introduction", "Conclusion", "New page", "References"]);
  });
  it("consolidates references and puts them at the end", () => {
    expect(documentBlocks(normalizeDocument("## References\nA\n## Body\nB\n## References\nC")).map((b) => b.title)).toEqual(["Body", "References"]);
  });
  it("merges continued section text without an early bibliography", () => {
    const result = appendSection(doc, "More analysis\n## References\nWrong", "Introduction");
    expect(result).toContain("Intro\n\nMore analysis");
    expect(result).not.toContain("Wrong");
  });
  it("starts main sections on clean PDF pages", () => {
    const tex = markdownToLatex(doc);
    expect(tex).toContain("\\clearpage\n\\section{Conclusion}");
    expect(tex).toContain("\\clearpage\n\\section*{References}");
    expect(tex).not.toContain("page-break");
  });
});