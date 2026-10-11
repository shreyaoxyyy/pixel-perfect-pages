export type StructureSection = { title: string; subsections: string[] };
export type WritingTask = {
  section: number;
  part: number;
  parts: number;
  words: number;
  subsections: string[];
};

/** Longest reply requested in one call; the writing service times out on longer replies. */
export const MAX_WORDS_PER_REQUEST = 450;
export const MIN_PAGES = 1;
export const MAX_PAGES = 200;

const WORDS_PER_PAGE: Record<string, number> = { Single: 500, "1.5 lines": 350, Double: 250 };
const SHORT_SECTION = /^(abstract|references|bibliography|works cited|executive summary)$/i;
const SKIPPED_SECTION = /^(cover page|title page|table of contents|contents|list of figures)$/i;

const clean = (text: string) =>
  text
    .replace(/\*\*|__|`/g, "")
    .replace(/\s*[([]\s*~?\d+(\.\d+)?\s*(pages?|pp?\.?|words)\s*[)\]]\s*$/i, "")
    .replace(/\s*[-–—:]\s*$/, "")
    .trim();

/** Reads a numbered or markdown-heading outline into main sections with subsections. */
export function parseStructure(text: string): StructureSection[] {
  const out: StructureSection[] = [];
  for (const raw of text.split("\n")) {
    const hashes = raw.trim().match(/^(#{1,6})\s+/)?.[1]?.length ?? 0;
    const line = raw
      .trim()
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[-*•]\s+/, "")
      .replace(/^\*\*(.+)\*\*$/, "$1")
      .trim();
    if (!line) continue;
    const sub = line.match(/^\d+\.\d+(?:\.\d+)*\.?\s+(.+)$/);
    if (sub?.[1]) {
      const title = clean(sub[1]);
      const last = out[out.length - 1];
      if (title && last && last.subsections.length < 5) last.subsections.push(title);
      continue;
    }
    const top = line.match(/^(?:section\s+)?\d+[.)]\s+(.+)$/i);
    if (top?.[1]) {
      const title = clean(top[1]);
      if (title) out.push({ title, subsections: [] });
      continue;
    }
    if (hashes) {
      const title = clean(line);
      if (!title) continue;
      if (hashes <= 2 || !out.length) out.push({ title, subsections: [] });
      else if (out[out.length - 1]!.subsections.length < 5)
        out[out.length - 1]!.subsections.push(title);
    }
  }
  return out.filter((s) => !SKIPPED_SECTION.test(s.title));
}

const s = (title: string, ...subsections: string[]): StructureSection => ({ title, subsections });

export function defaultStructure(type: string): StructureSection[] {
  switch (type) {
    case "Assignment":
      return [
        s("Introduction", "Background", "Purpose of the assignment"),
        s("Key Concepts"),
        s("Analysis", "Main arguments", "Examples"),
        s("Discussion"),
        s("Conclusion"),
        s("References"),
      ];
    case "Project Report":
      return [
        s("Abstract"),
        s("Introduction", "Background", "Problem statement", "Objectives"),
        s("Scope and Requirements"),
        s("System Design", "Architecture", "Tools and technologies"),
        s("Implementation"),
        s("Results and Testing"),
        s("Conclusion and Future Scope"),
        s("References"),
      ];
    case "Seminar Report":
      return [
        s("Introduction"),
        s("Background"),
        s("Core Concepts"),
        s("Applications"),
        s("Advantages and Limitations"),
        s("Future Scope"),
        s("Conclusion"),
        s("References"),
      ];
    case "Case Study":
      return [
        s("Executive Summary"),
        s("Background"),
        s("Problem Identification"),
        s("Analysis"),
        s("Alternatives"),
        s("Recommendations"),
        s("Conclusion"),
        s("References"),
      ];
    case "Literature Review":
      return [
        s("Introduction", "Scope", "Research questions"),
        s("Review Methodology"),
        s("Thematic Review"),
        s("Research Gaps"),
        s("Conclusion"),
        s("References"),
      ];
    case "Custom Document":
      return [s("Introduction"), s("Main Discussion"), s("Conclusion"), s("References")];
    default:
      return [
        s("Abstract"),
        s("Introduction", "Background", "Problem statement", "Objectives"),
        s("Literature Review"),
        s("Methodology", "Research design", "Data collection", "Analysis"),
        s("Results"),
        s("Discussion"),
        s("Conclusion"),
        s("References"),
      ];
  }
}

const pagesOf = (answers: string[]) => Number(answers[1]) || 5;

export function structureInstruction(topic: string, answers: string[]): string {
  const type = answers[0] ?? "Research Paper";
  const pages = pagesOf(answers);
  const count = Math.min(14, Math.max(5, Math.round(4 + pages / 4)));
  const extra =
    answers[7] && answers[7] !== "No additional instructions"
      ? ` Follow these requirements: ${answers[7]}.`
      : "";
  return `Plan the structure of a ${pages}-page ${type} on "${topic}".${extra} Use sections that suit a ${type}, specific to this topic, with about ${count} main sections. Return ONLY the numbered outline and nothing else, in exactly this format:
1. Main section title
1.1 Subsection title
1.2 Subsection title
2. Main section title
Give main sections 0–4 subsections. Do not include a cover page or table of contents. ${answers[2] === "None" ? "" : "End with References."}`;
}

/** Splits the document into requests sized to the page limit and the per-request word cap. */
export function planWriting(sections: StructureSection[], answers: string[]): WritingTask[] {
  const pages = pagesOf(answers);
  const bodyPages = Math.max(1, pages - (answers[6] === "Yes" ? 1 : 0));
  const total = bodyPages * (WORDS_PER_PAGE[answers[5] ?? ""] ?? 350);
  const isShort = (t: string) => SHORT_SECTION.test(t.trim());
  const shortCount = sections.filter((x) => isShort(x.title)).length;
  const shortWords = Math.min(250, Math.max(120, Math.round(total / 12)));
  const longCount = Math.max(1, sections.length - shortCount);
  const perSection = Math.max(150, Math.round((total - shortCount * shortWords) / longCount));
  const tasks: WritingTask[] = [];
  sections.forEach((section, i) => {
    const words = isShort(section.title) ? shortWords : perSection;
    const parts = Math.max(1, Math.ceil(words / MAX_WORDS_PER_REQUEST));
    const subs = section.subsections;
    for (let p = 0; p < parts; p++) {
      tasks.push({
        section: i,
        part: p + 1,
        parts,
        words: Math.round(words / parts),
        subsections: subs.filter((_, k) => Math.floor((k * parts) / subs.length) === p),
      });
    }
  });
  return tasks;
}

export function sectionInstruction(
  task: WritingTask,
  section: StructureSection,
  topic: string,
  answers: string[],
): string {
  const type = answers[0] ?? "Research Paper";
  const citation = answers[2] ?? "APA";
  const n = task.section + 1;
  const where =
    task.parts > 1
      ? `part ${task.part} of ${task.parts} of section ${n} "${section.title}"`
      : `section ${n} "${section.title}"`;
  const start =
    task.part === 1
      ? `Begin with the heading "## ${section.title}".`
      : `Continue directly from the previous text. Do not repeat the section heading or earlier points.`;
  const subs = task.subsections.length
    ? ` Cover these subsections as "### " headings: ${task.subsections.join("; ")}.`
    : "";
  if (/^(references|bibliography|works cited)$/i.test(section.title.trim()))
    return `Write the ${section.title} section for a ${type} on "${topic}". ${start} List 6–10 entries formatted in ${citation} style describing the kinds of sources a student should cite, each ending with "[verify and replace]". Never present invented sources as real. Output markdown only.`;
  return `Write ${where} of a ${answers[1] ?? 5}-page ${type} on "${topic}". ${start}${subs} Target about ${task.words} words and do not exceed ${task.words + 80}. Use natural academic writing, readable paragraphs and logical flow without repeating earlier sections. ${citation === "None" ? "Do not add citations." : `Where evidence is needed use ${citation}-style in-text placeholders such as (Author, Year) — never invent specific real-looking sources.`} Output markdown only, no preamble.`;
}

export function structureMarkdown(sections: StructureSection[]): string {
  return sections
    .map(
      (x) => `## ${x.title}\n${x.subsections.map((sub) => `### ${sub}\n`).join("")}`,
    )
    .join("\n");
}
