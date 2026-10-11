const SPECIAL: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

export const escapeLatex = (text: string) =>
  text.replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "").replace(/[\\&%$#_{}~^]/g, (c) => SPECIAL[c]!);

const INLINE =
  /(`[^`]+`)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*/g;

export function inlineLatex(text: string): string {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    out += escapeLatex(text.slice(last, m.index));
    if (m[1]) out += `\\texttt{${escapeLatex(m[1].slice(1, -1))}}`;
    else if (m[2] && m[3]) out += `\\href{${m[3].replace(/[\\%#{}]/g, (c) => `\\${c}`)}}{${inlineLatex(m[2])}}`;
    else if (m[4] ?? m[5]) out += `\\textbf{${inlineLatex((m[4] ?? m[5])!)}}`;
    else if (m[6]) out += `\\emph{${inlineLatex(m[6])}}`;
    last = m.index + m[0].length;
  }
  return out + escapeLatex(text.slice(last));
}

const UNNUMBERED = /^(abstract|references|bibliography|works cited|executive summary)$/i;

function heading(level: number, raw: string): string {
  const title = raw.replace(/^\d+(\.\d+)*\.?\s+/, "").replace(/\*\*/g, "").trim();
  const cmd = level <= 2 ? "section" : level === 3 ? "subsection" : "subsubsection";
  if (UNNUMBERED.test(title))
    return `\\${cmd}*{${inlineLatex(title)}}\n\\addcontentsline{toc}{${cmd}}{${inlineLatex(title)}}`;
  return `\\${cmd}{${inlineLatex(title)}}`;
}

/** Converts the generated markdown into LaTeX body content. `safe` drops tables and verbatim blocks. */
export function markdownToLatex(markdown: string, safe = false): string {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let list: "itemize" | "enumerate" | null = null;
  const closeList = () => {
    if (list) out.push(`\\end{${list}}`);
    list = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      closeList();
      const code: string[] = [];
      while (++i < lines.length && !lines[i]!.trim().startsWith("```")) code.push(lines[i]!);
      if (safe) out.push(...code.map((c) => `${escapeLatex(c)}\\\\`));
      else out.push("\\begin{verbatim}", ...code.map((c) => c.replace(/\\end\{verbatim\}/g, "")), "\\end{verbatim}");
      continue;
    }
    if (trimmed.startsWith("|")) {
      closeList();
      const rows: string[][] = [];
      for (; i < lines.length && lines[i]!.trim().startsWith("|"); i++) {
        const row = lines[i]!.trim();
        if (/^\|?[\s:|-]+\|?$/.test(row)) continue;
        rows.push(row.replace(/^\||\|$/g, "").split("|").map((c) => inlineLatex(c.trim())));
      }
      i--;
      const cols = Math.max(1, ...rows.map((r) => r.length));
      if (safe) out.push(...rows.map((r) => `${r.join(" --- ")}\\\\`));
      else
        out.push(
          "\\begin{center}\\small",
          `\\begin{tabularx}{\\linewidth}{|${"X|".repeat(cols)}}\\hline`,
          ...rows.map((r, k) => {
            const cells = [...r, ...Array(cols - r.length).fill("")];
            return `${k === 0 ? cells.map((c) => `\\textbf{${c}}`).join(" & ") : cells.join(" & ")} \\\\ \\hline`;
          }),
          "\\end{tabularx}",
          "\\end{center}",
        );
      continue;
    }
    const h = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      closeList();
      out.push(heading(h[1]!.length, h[2]!));
      continue;
    }
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const kind = bullet ? "itemize" : "enumerate";
      if (list !== kind) {
        closeList();
        out.push(`\\begin{${kind}}`);
        list = kind;
      }
      out.push(`\\item ${inlineLatex((bullet ?? numbered)![1]!)}`);
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeList();
      out.push("\\medskip");
      continue;
    }
    if (!trimmed) {
      closeList();
      out.push("");
      continue;
    }
    closeList();
    if (trimmed.startsWith(">"))
      out.push(`\\begin{quote}${inlineLatex(trimmed.replace(/^>\s?/, ""))}\\end{quote}`);
    else out.push(inlineLatex(trimmed));
  }
  closeList();
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

const FONTS: Record<string, string> = {
  Lora: "\\usepackage{lora}",
  "DM Sans": "\\setmainfont{TeX Gyre Heros}",
  "Times New Roman": "\\setmainfont{TeX Gyre Termes}",
  "IBM Plex Mono": "\\usepackage{plex-mono}\n\\renewcommand{\\familydefault}{\\ttdefault}",
};
const SPACING: Record<string, string> = {
  Single: "\\singlespacing",
  "1.5 lines": "\\onehalfspacing",
  Double: "\\doublespacing",
};

export type CoverInfo = {
  institution: string;
  fields: { label: string; value: string }[];
  /** Lines copied from an uploaded layout, in order; overrides the default layout. */
  layoutLines?: string[] | undefined;
};

function coverPage(title: string, type: string, info?: CoverInfo): string {
  if (info?.layoutLines?.length) {
    const lines = info.layoutLines
      .map((l) => l.replace(/\{\{TITLE\}\}/g, "\u0000"))
      .map((l) => (l.includes("\u0000") ? `{\\LARGE\\bfseries ${title}\\par}` : `{\\large ${inlineLatex(l)}\\par}`))
      .join("\\vspace{0.6cm}\n");
    return `\\begin{titlepage}\\centering\\vspace*{2cm}\n${lines}\n\\vfill{\\large \\today\\par}\\end{titlepage}`;
  }
  const fields = (info?.fields ?? []).filter((f) => f.value.trim());
  const table = fields.length
    ? `\\begin{tabular}{@{}l@{\\hspace{1em}}l@{}}\n${fields.map((f) => `\\textbf{${escapeLatex(f.label)}:} & ${escapeLatex(f.value)} \\\\[4pt]`).join("\n")}\n\\end{tabular}`
    : "";
  const inst = info?.institution.trim() ? `{\\Large\\scshape ${escapeLatex(info.institution)}\\par}\\vspace{0.4cm}\\rule{\\linewidth}{0.6pt}\\par\\vspace{2.5cm}` : "\\vspace*{3cm}";
  return `\\begin{titlepage}\\centering\\vspace*{1cm}
${inst}
{\\LARGE\\bfseries ${title}\\par}\\vspace{0.8cm}{\\Large ${escapeLatex(type)}\\par}
\\vfill
${table ? `{\\large Submitted by\\par}\\vspace{0.4cm}{\\large ${table}\\par}\\vspace{1.5cm}` : ""}
{\\large \\today\\par}\\end{titlepage}`;
}

/** Builds a complete XeLaTeX document from the user's preferences and the markdown body. */
export function buildLatexDocument(options: {
  topic: string;
  answers: string[];
  body: string;
  safe?: boolean;
  cover?: CoverInfo | undefined;
}): string {
  const { topic, answers, body, safe = false, cover: info } = options;
  const type = answers[0] ?? "Research Paper";
  const paper = answers[3] === "Letter" ? "letterpaper" : "a4paper";
  const title = inlineLatex(topic);
  const font = safe ? "" : (FONTS[answers[4] ?? ""] ?? "");
  const cover =
    answers[6] === "No"
      ? `\\begin{center}{\\LARGE\\bfseries ${title}\\par}\\vspace{4pt}{\\large ${escapeLatex(type)}\\par}\\vspace{2pt}{\\small \\today\\par}\\end{center}\\bigskip`
      : coverPage(title, type, info);
  const toc = Number(answers[1]) >= 6 ? "\\tableofcontents\n\\newpage" : "";
  return `\\documentclass[12pt,${paper}]{article}
\\usepackage{fontspec}
${font}
\\usepackage[margin=1in]{geometry}
\\usepackage{setspace}
\\usepackage{tabularx}
\\usepackage{fancyhdr}
\\usepackage[hidelinks]{hyperref}
\\setlength{\\headheight}{15pt}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\small ${title}}
\\fancyfoot[C]{\\thepage}
\\setlength{\\parskip}{6pt}
\\begin{document}
${cover}
${toc}
${SPACING[answers[5] ?? ""] ?? "\\onehalfspacing"}
${markdownToLatex(body, safe)}
\\end{document}
`;
}
