export type DocumentBlock = { title: string; text: string; added: boolean };
export const PAGE_BREAK = "<!-- page-break -->";
export const isReferences = (title: string) => /^(?:\d+[.)]?\s*)?(references|bibliography|works cited)\s*$/i.test(title.replace(/\*\*/g, "").trim());

/** Keep explicit added pages and main sections as independently movable blocks. */
export function documentBlocks(markdown: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  let current: DocumentBlock | undefined;
  let added = false;
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (line.trim() === PAGE_BREAK && !fenced) { current = undefined; added = true; continue; }
    const heading = !fenced ? line.match(/^#{1,2}\s+(.+)$/) : null;
    if (heading || !current) {
      current = { title: heading?.[1]?.replace(/\*\*/g, "") ?? "Document opening", text: "", added };
      blocks.push(current);
      added = false;
    }
    current.text += `${current.text ? "\n" : ""}${line}`;
    if (line.trim().startsWith("```")) fenced = !fenced;
  }
  return blocks.filter((b) => b.text.trim()).map((b) => ({ ...b, text: b.text.trim() }));
}

export function joinDocument(blocks: DocumentBlock[]): string {
  const body = blocks.filter((b) => !isReferences(b.title));
  const refs = blocks.filter((b) => isReferences(b.title));
  // Merge repeated reference headings into one final section.
  if (refs.length) body.push({ title: "References", added: false, text: refs.map((b, i) => i ? b.text.replace(/^#{1,2}\s+[^\n]+\n?/, "") : b.text).join("\n\n") });
  return body.map((b) => `${b.added ? `${PAGE_BREAK}\n` : ""}${b.text}`).join("\n\n");
}

export const normalizeDocument = (markdown: string) => joinDocument(documentBlocks(markdown));

export function appendSection(markdown: string, response: string, title: string): string {
  let text = response.trim();
  if (!isReferences(title)) {
    // The writer must not prematurely emit a bibliography from the preceding context.
    text = text.split(/^#{1,3}\s+(?:\d+[.)]?\s*)?(?:References|Bibliography|Works Cited)\s*$/im)[0]?.trim() ?? "";
    text = text.replace(/^#{1,2}\s+(.+)$/gm, (line, heading: string) => heading.trim() === title.trim() ? line : `### ${heading}`);
  }
  const blocks = documentBlocks(markdown);
  const existing = blocks.find((b) => !b.added && b.title.trim() === title.trim());
  if (existing) existing.text += `\n\n${text.replace(/^#{1,2}\s+[^\n]+\n?/, "")}`;
  else blocks.push({ title, text: /^#{1,2}\s/.test(text) ? text : `## ${title}\n\n${text}`, added: false });
  return joinDocument(blocks);
}

export function insertExtraPage(markdown: string, response: string, page: number): string {
  const blocks = documentBlocks(markdown);
  const text = response.trim().replace(/^#{1,3}\s+(.+)$/m, "## $1");
  const title = text.match(/^##\s+(.+)$/m)?.[1] ?? `Additional page ${page}`;
  const end = blocks.findIndex((b) => /^(conclusion|references|bibliography|works cited)\b/i.test(b.title));
  blocks.splice(end < 0 ? blocks.length : end, 0, { title, text: /^##\s/.test(text) ? text : `## ${title}\n\n${text}`, added: true });
  return joinDocument(blocks);
}

export function moveDocumentBlock(markdown: string, from: number, to: number): string {
  const blocks = documentBlocks(markdown);
  const moving = blocks[from];
  if (!moving || isReferences(moving.title) || to < 0 || to >= blocks.length) return markdown;
  blocks.splice(from, 1);
  blocks.splice(to, 0, moving);
  return joinDocument(blocks);
}