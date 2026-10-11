import { MAX_PAGES, MIN_PAGES } from "./document-structure";

export const documentQuestions = [
  {
    key: "type",
    label: "Document type",
    prompt: "What kind of document are you working on?",
    defaultValue: "Research Paper",
    choices: [
      "Research Paper",
      "Assignment",
      "Project Report",
      "Term Paper",
      "Seminar Report",
      "Case Study",
      "Literature Review",
      "Custom Document",
    ],
  },
  {
    key: "pages",
    label: "Length",
    prompt: "How many pages would you like?",
    defaultValue: "5",
    choices: [],
  },
  {
    key: "citation",
    label: "Citations",
    prompt: "Which citation style should we use?",
    defaultValue: "APA",
    choices: ["APA", "MLA", "IEEE", "Harvard", "Chicago", "None"],
  },
  {
    key: "size",
    label: "Page size",
    prompt: "Which page size would you like?",
    defaultValue: "A4",
    choices: ["A4", "Letter"],
  },
  {
    key: "font",
    label: "Document font",
    prompt: "Which font should the document use?",
    defaultValue: "Lora",
    choices: ["Lora", "DM Sans", "Times New Roman", "IBM Plex Mono"],
  },
  {
    key: "spacing",
    label: "Line spacing",
    prompt: "What line spacing would you prefer?",
    defaultValue: "1.5 lines",
    choices: ["Single", "1.5 lines", "Double"],
  },
  {
    key: "cover",
    label: "Cover page",
    prompt: "Would you like a cover page?",
    defaultValue: "Yes",
    choices: ["Yes", "No"],
  },
  {
    key: "instructions",
    label: "Instructions",
    prompt: "Any other requirements or instructions?",
    defaultValue: "No additional instructions",
    choices: [],
  },
] as const;

export function validateAnswer(index: number, text: string): string | null {
  if (!text.trim()) return "Please enter an answer.";
  const question = documentQuestions[index];
  if (!question) return "All questions are complete.";
  if (
    question.key === "pages" &&
    (!/^\d+$/.test(text.trim()) || Number(text) < MIN_PAGES || Number(text) > MAX_PAGES)
  )
    return `Choose a whole number between ${MIN_PAGES} and ${MAX_PAGES} pages.`;
  if (
    question.choices.length &&
    !question.choices.some((choice) => choice.toLowerCase() === text.trim().toLowerCase())
  )
    return `Choose one of the listed ${question.label.toLowerCase()} options.`;
  return null;
}

export function recordAnswer(answers: string[], text: string): string[] {
  if (validateAnswer(answers.length, text)) return answers;
  return [...answers, text.trim()];
}

export function outlineText(topic: string, answers: string[], sections: string[]): string {
  return `# ${topic}\n\n${documentQuestions.map((q, i) => `${q.label}: ${answers[i] ?? q.defaultValue}`).join("\n")}\n\n${sections.map((s, i) => `## ${i + 1}. ${s}\n\n`).join("")}`;
}
