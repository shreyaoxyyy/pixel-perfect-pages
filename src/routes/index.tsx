import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Plus,
  X,
  Download,
  ListOrdered,
  Pencil,
  Copy,
  Check,
  Undo2,
  ArrowDown,
  Paperclip,
  FileText,
  Square,
  BookOpen,
  FlaskConical,
  Leaf,
  BriefcaseBusiness,
  RotateCcw,
  ArrowUpRight,
  Mail,
  FileCode2,
  Coffee,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AppearancePanel } from "@/components/appearance-panel";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { documentQuestions, outlineText, validateAnswer } from "@/lib/document-flow";
import { useServerFn } from "@tanstack/react-start";
import { WorkspaceLoader } from "@/components/workspace-loader";
import { askDeepSeek } from "@/lib/deepseek.functions";
import {
  defaultStructure,
  parseStructure,
  planWriting,
  targetWords,
  sectionInstruction,
  structureInstruction,
  structureMarkdown,
  MAX_PAGES,
  MIN_PAGES,
  type StructureSection,
} from "@/lib/document-structure";
import { buildLatexDocument } from "@/lib/document-latex";
import { compileLatex } from "@/lib/latex.functions";
import { sendPdfEmail } from "@/lib/mail.functions";
import { EMAIL_TEMPLATES, type EmailTemplate } from "@/lib/email-templates";
import mark from "@/assets/scriptorium-mark.png";
import { requestWithRetry, type RetryStatus } from "@/lib/writing-retry";
import { MemoryGame } from "@/components/memory-game";
import { DocumentPageOrder } from "@/components/document-page-order";
import { appendSection, insertExtraPage, normalizeDocument, PAGE_BREAK } from "@/lib/document-order";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scriptorium — Your academic writing studio" },
      {
        name: "description",
        content:
          "Shape your next research paper, assignment or project report in a personal academic writing workspace.",
      },
      { property: "og:title", content: "Scriptorium — Your academic writing studio" },
      {
        property: "og:description",
        content: "A thoughtful space for academic ideas, document planning, and writing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
function IconButton({
  label,
  children,
  onClick,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
function Assistant({ children }: { children: React.ReactNode }) {
  return (
    <Message from="assistant" className="chat-assistant">
      <img src={mark} width={24} height={28} alt="Scriptorium" />
      <MessageContent>{children}</MessageContent>
    </Message>
  );
}
function Index() {
  const requestAI = useServerFn(askDeepSeek);
  const requestPdf = useServerFn(compileLatex);
  const [pdfUrl, setPdfUrl] = useState("");
  const requestMail = useServerFn(sendPdfEmail);
  const [pdfData, setPdfData] = useState("");
  const [cover, setCover] = useState({ institution: "", name: "", className: "", roll: "", extra: "" });
  const [coverLayout, setCoverLayout] = useState<string[] | null>(null);
  const [mail, setMail] = useState({ to: "", template: "modern" as EmailTemplate });
  const [mailStatus, setMailStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [building, setBuilding] = useState(false);
  const [retryStatus, setRetryStatus] = useState<RetryStatus | null>(null);
  const [resumeTask, setResumeTask] = useState(0);
  const [extraRemaining, setExtraRemaining] = useState(0);
  const [showGame, setShowGame] = useState(false);
  const [writingComplete, setWritingComplete] = useState(false);
  const [writing, setWriting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [customPages, setCustomPages] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMotionReady(true));
    const timer = window.setTimeout(() => setSplashGone(true), 1100);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Match the actual visible phone screen, including keyboard panning.
        const root = document.documentElement;
        root.style.setProperty("--workspace-height", `${viewport.height}px`);
        root.style.setProperty("--workspace-top", `${viewport.offsetTop}px`);
      });
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => { cancelAnimationFrame(frame); viewport.removeEventListener("resize", sync); viewport.removeEventListener("scroll", sync); };
  }, []);
  const [initialOutline, setInitialOutline] = useState("");
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [followups, setFollowups] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [generatedDocument, setGeneratedDocument] = useState("");
  const [writtenSections, setWrittenSections] = useState(0);
  const [attachment, setAttachment] = useState<{ name: string; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const [draft, setDraft] = useState("");
  const [topic, setTopic] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [sections, setSections] = useState<StructureSection[]>([]);
  const [previousSections, setPreviousSections] = useState<StructureSection[] | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const index = editing ?? answers.length;
  const question = documentQuestions[index];
  const complete = !!topic && !question;
  const reset = () => {
    requestVersion.current += 1;
    setThinking(false);
    setRetryStatus(null);
    setResumeTask(0);
    setExtraRemaining(0);
    setWritingComplete(false);
    setInitialOutline("");
    setHistory([]);
    setFollowups([]);
    setGeneratedDocument("");
    setWrittenSections(0);
    setAttachment(null);
    setDraft("");
    setTopic("");
    setAnswers([]);
    setEditing(null);
    setError("");
    setSections([]);
    setPreviousSections(null);
    setCopied(false);
    setWriting(false);
    setProgress({ done: 0, total: 0, label: "" });
    setCustomPages(false);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl("");
    if (copyTimer.current) clearTimeout(copyTimer.current);
    textareaRef.current?.focus();
  };
  const runAI = async (
    instruction: string,
    conversation: { role: "user" | "assistant"; content: string }[],
  ) => {
    const version = ++requestVersion.current;
    setThinking(true);
    setError("");
    try {
      const result = await requestWithRetry(
        () => requestAI({ data: { history: conversation, instruction } }),
        () => version === requestVersion.current,
        setRetryStatus,
      );
      if (!result) return null;
      if (version !== requestVersion.current) return null;
      if (result.error) {
        setError(result.error);
        return null;
      }
      setHistory([...conversation, { role: "assistant", content: result.text }]);
      return result.text;
    } catch {
      if (version === requestVersion.current)
        setError(
          "Couldn't connect to the writing service. Your work is saved in this chat; please try again.",
        );
      return null;
    } finally {
      if (version === requestVersion.current) { setThinking(false); setRetryStatus(null); }
    }
  };
  const buildStructure = async (answersNow: string[], conversation = history) => {
    const result = await runAI(structureInstruction(topic, answersNow), [
      ...conversation,
      { role: "user", content: `Topic: ${topic}` },
    ]);
    if (!result) return;
    const parsed = parseStructure(result);
    if (
      parsed.length >= 3 &&
      answersNow[2] !== "None" &&
      !parsed.some((x) => /^(references|bibliography|works cited)$/i.test(x.title.trim()))
    )
      parsed.push({ title: "References", subsections: [] });
    setSections(parsed.length >= 3 ? parsed : defaultStructure(answersNow[0] ?? ""));
    if (result && parsed.length < 3)
      setError("Couldn't read a topic-specific structure, so a standard one is shown. You can edit it.");
  };
  const generateDocument = async (resume = false) => {
    if (thinking || writing) return;
    const tasks = planWriting(sections, answers);
    const version = ++requestVersion.current;
    setWriting(true);
    setError("");
    setWritingComplete(false);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl("");
    let doc = resume ? generatedDocument : "";
    const start = resume ? resumeTask : 0;
    if (!resume) {
      setGeneratedDocument("");
      setWrittenSections(0);
      setResumeTask(0);
      setExtraRemaining(0);
    }
    const outline = `Topic: ${topic}\nPreferences: ${answers.join(" | ")}\nOutline:\n${structureMarkdown(sections)}`;
    for (let t = start; t < tasks.length; t++) {
      const task = tasks[t];
      if (!task) continue;
      const section = sections[task.section];
      if (!section) continue;
      setProgress({ done: t, total: tasks.length, label: section.title });
      const result = await requestWithRetry(
        () => requestAI({ data: {
          history: [{ role: "user", content: outline }, ...(doc ? [{ role: "assistant" as const, content: doc.slice(-1500) }] : [])],
          instruction: sectionInstruction(task, section, topic, answers),
        } }),
        () => version === requestVersion.current,
        setRetryStatus,
      );
      if (version !== requestVersion.current || !result) return;
      if (result.error || !result.text.trim()) {
        setWriting(false);
        setRetryStatus(null);
        setError(result.error || "No text was returned. Continue writing to retry this part.");
        return;
      }
      doc = appendSection(doc, result.text, section.title);
      setGeneratedDocument(doc);
      setResumeTask(t + 1);
      setProgress({ done: t + 1, total: tasks.length, label: section.title });
      setWrittenSections(task.section + (task.part === task.parts ? 1 : 0));
    }
    // The writer often returns fewer words than asked; top up until the page target is met.
    const target = targetWords(answers);
    const count = (t: string) => t.split(/\s+/).filter(Boolean).length;
    const maxRounds = Math.ceil(target / 300) + 2;
    for (let round = 0; count(doc) < target * 0.95 && round < maxRounds; round++) {
      const missing = target - count(doc);
      const words = Math.min(350, Math.max(150, missing));
      setProgress({ done: tasks.length, total: tasks.length + Math.ceil(missing / 300), label: `Reaching ${answers[1]} pages` });
      const headings = doc.split("\n").filter((l) => /^#{2,3}\s/.test(l)).join("\n");
      const result = await requestWithRetry(
        () => requestAI({ data: {
          history: [
            { role: "user", content: `Topic: ${topic}\nExisting headings:\n${headings.slice(-2500)}` },
            { role: "assistant", content: doc.slice(-1200) },
          ],
          instruction: `Expand this ${answers[0] ?? "document"} with about ${words} words of NEW, relevant content: a new "### " subsection that deepens an existing main section. Never include a conclusion, bibliography or references heading or source list. Do not repeat existing points. Output only the new Markdown text.`,
        } }),
        () => version === requestVersion.current,
        setRetryStatus,
      );
      if (version !== requestVersion.current || !result) return;
      if (result.error || !result.text.trim()) {
        setWriting(false);
        setRetryStatus(null);
        setError(result.error || "No text was returned. Continue writing to retry this part.");
        return;
      }
      const closing = sections.find((s) => /^(conclusion|discussion|analysis)/i.test(s.title)) ?? sections.find((s) => !/^(references|bibliography|works cited)$/i.test(s.title));
      doc = appendSection(doc, result.text, closing?.title ?? "Further discussion");
      setGeneratedDocument(doc);
    }
    setRetryStatus(null);
    setWritingComplete(true);
    setWriting(false);
  };
  const stopWriting = () => {
    requestVersion.current += 1;
    setWriting(false);
    setThinking(false);
    setRetryStatus(null);
  };
  const wordCount = generatedDocument.split(/\s+/).filter(Boolean).length;
  const addPages = async () => {
    if (thinking || writing || !generatedDocument) return;
    const version = ++requestVersion.current;
    setWriting(true);
    setError("");
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl("");
    let doc = generatedDocument;
    const count = extraRemaining || 2;
    setExtraRemaining(count);
    const headings = doc.split("\n").filter((l) => /^#{1,3}\s/.test(l)).join("\n");
    for (let t = 0; t < count; t++) {
      setProgress({ done: t, total: count, label: "Extra content" });
      const result = await requestWithRetry(
        () => requestAI({ data: {
          history: [
            { role: "user", content: `Topic: ${topic}\nExisting headings:\n${headings}` },
            { role: "assistant", content: doc.slice(-1500) },
          ],
          instruction: "Write one new standalone page of about 450 words of NEW, relevant content, beginning with a single ## heading. Do not repeat existing points. Do not include a conclusion, references, bibliography or source list. Write only this page in Markdown.",
        } }),
        () => version === requestVersion.current,
        setRetryStatus,
      );
      if (version !== requestVersion.current || !result) return;
      if (result.error || !result.text.trim()) {
        setError(result.error || "Couldn't add more pages. Please try again.");
        setRetryStatus(null);
        setWriting(false);
        return;
      }
      doc = insertExtraPage(doc, result.text, t + 1);
      setGeneratedDocument(doc);
      setExtraRemaining(count - t - 1);
      setProgress({ done: t + 1, total: count, label: "Extra content" });
    }
    setRetryStatus(null);
    setWriting(false);
  };
  const respond = async (text: string) => {
    if (!text.trim() || thinking || writing) return;
    if (!topic) {
      setTopic(text.trim());
      setDraft("");
      setError("");
      setHistory([
        {
          role: "user",
          content:
            text.trim() +
            (attachment ? `\nAttached reference (${attachment.name}):\n${attachment.text}` : ""),
        },
      ]);
      return;
    }
    if (complete) {
      setDraft("");
      const message = { role: "user" as const, content: text.trim() };
      setFollowups((old) => [...old, message]);
      const result = await runAI(
        "Respond to the latest user request about this document. Use all earlier preferences and conversation.",
        [...history, message],
      );
      if (result) setFollowups((old) => [...old, { role: "assistant", content: result }]);
      return;
    }
    const problem = validateAnswer(index, text);
    if (problem) {
      setError(problem);
      return;
    }
    const next = [...answers];
    next[index] = text.trim();
    setHistory((old) => [
      ...old,
      { role: "assistant", content: question?.prompt ?? "" },
      { role: "user", content: text.trim() },
    ]);
    setAnswers(next);
    setEditing(null);
    setDraft("");
    setError("");
    if (next.length === documentQuestions.length && (sections.length === 0 || editing !== null))
      void buildStructure(next);
    textareaRef.current?.focus();
  };
  const editAnswer = (i: number) => {
    setHistory((old) => [
      ...old,
      {
        role: "user",
        content: `Correction — ${documentQuestions[i]?.label}: answer is being revised.`,
      },
    ]);
    setEditing(i);
    setDraft(answers[i] ?? "");
    setError("");
    textareaRef.current?.focus();
  };
  const changeSections = (next: StructureSection[]) => {
    setResumeTask(0);
    setWritingComplete(false);
    setPreviousSections(sections);
    setSections(next);
    setCopied(false);
  };
  const moveSection = (i: number, offset: number) => {
    const next = [...sections];
    const current = next[i];
    const adjacent = next[i + offset];
    if (current === undefined || adjacent === undefined) return;
    next[i] = adjacent;
    next[i + offset] = current;
    changeSections(next);
  };
  const saveBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const fileBase = topic.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "document";
  const downloadTex = () =>
    saveBlob(
      new Blob([buildLatexDocument({ topic, answers, body: generatedDocument })], {
        type: "application/x-tex",
      }),
      `${fileBase}.tex`,
    );
  const coverFields = () => [
    { label: "Name", value: cover.name },
    { label: "Class", value: cover.className },
    { label: "Roll No. / Reg. No.", value: cover.roll },
    ...cover.extra.split("\n").map((l) => {
      const [label, ...rest] = l.split(":");
      return { label: (label ?? "").trim(), value: rest.join(":").trim() };
    }).filter((f) => f.label && f.value),
  ];
  const buildCoverInfo = async () => {
    const info = { institution: cover.institution, fields: coverFields(), layoutLines: coverLayout ?? undefined };
    if (answers[6] === "No" || !attachment || coverLayout) return info;
    // Follow the uploaded layout's cover page when a reference file is attached.
    const r = await requestAI({ data: {
      history: [{ role: "user", content: `Reference file:\n${attachment.text.slice(0, 2500)}` }],
      instruction: `Copy the cover/title page layout from the reference file. Return ONLY its lines in order, one per line, plain text without markdown. Put {{TITLE}} on the title line (title: "${topic}"). Fill in these details where the layout has matching fields: Institution: ${cover.institution || "-"}; ${coverFields().map((f) => `${f.label}: ${f.value}`).join("; ")}. Omit lines you have no value for. Maximum 14 lines. If the reference has no cover page, return NONE.`,
    } }).catch(() => null);
    const lines = (r?.text ?? "").split("\n").map((l) => l.replace(/^[#*\-\s]+|\*\*/g, "").trim()).filter(Boolean).slice(0, 14);
    if (lines.length >= 2 && !/^none$/i.test(lines[0]!)) {
      setCoverLayout(lines);
      return { ...info, layoutLines: lines };
    }
    setCoverLayout([]);
    return info;
  };
  const emailPdf = async () => {
    if (sending || !pdfData) return;
    if (!/^\S+@\S+\.\S+$/.test(mail.to.trim())) return setMailStatus("Enter a valid email address.");
    setSending(true);
    setMailStatus("");
    try {
      const r = await requestMail({ data: {
        to: mail.to.trim(), name: cover.name, topic, type: answers[0] ?? "Document", pages: answers[1] ?? "",
        words: wordCount, template: mail.template, pdf: pdfData, filename: `${fileBase}.pdf`,
      } });
      setMailStatus(r.ok ? `Sent to ${mail.to.trim()}.` : r.error);
    } catch {
      setMailStatus("Couldn't send the email. Please try again.");
    } finally {
      setSending(false);
    }
  };
  const buildPdf = async () => {
    if (building || !generatedDocument) return;
    setBuilding(true);
    setError("");
    try {
      const coverInfo = await buildCoverInfo();
      let r = await requestPdf({
        data: { tex: buildLatexDocument({ topic, answers, body: generatedDocument, cover: coverInfo }) },
      });
      if (r.compileFailed)
        r = await requestPdf({
          data: { tex: buildLatexDocument({ topic, answers, body: generatedDocument, safe: true, cover: coverInfo }) },
        });
      if (!r.pdf) {
        setError(r.error || "The PDF couldn't be built.");
        return;
      }
      setPdfData(r.pdf);
      const bytes = Uint8Array.from(atob(r.pdf), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
      saveBlob(blob, `${fileBase}.pdf`);
    } catch {
      setError("Couldn't reach the PDF service. Please try again.");
    } finally {
      setBuilding(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        generatedDocument || outlineText(topic, answers, sections.map((x) => x.title)),
      );
      setCopied(true);
      setError("");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy isn't available here. You can download the outline instead.");
    }
  };
  return (
    <TooltipProvider>
      <div className="single-chat" data-motion-ready={motionReady} data-empty={!topic}>
        {!splashGone && (
          <div className="app-splash" data-leaving={motionReady} role="status" aria-label="Opening workspace">
            <WorkspaceLoader />
            <span>Opening your workspace…</span>
          </div>
        )}
        <header className="chat-header">
          <div className="chat-header-inner">
            <div className="brand">
              <img src={mark} width={31} height={35} alt="Scriptorium book mark" />
              <div className="brand-name">Scriptorium</div>
            </div>
            <span className="header-context">Writing studio</span>
            <div className="chat-header-actions">
              <AppearancePanel />
              <IconButton label="New document" onClick={reset}>
                <Plus />
              </IconButton>
            </div>
          </div>
        </header>
        {topic && (
          <nav className="workflow-strip" aria-label="Document progress">
            {["Topic", "Preferences", "Document"].map((label, step) => {
              const current = complete ? 2 : 1;
              return <div key={label} className="workflow-item" data-active={step === current} data-done={step < current}>
                <span className="workflow-marker">{step < current ? <Check /> : step === 0 ? <Pencil /> : step === 1 ? <SlidersHorizontal /> : <FileText />}</span>
                <span>{label}</span>
                {step === 1 && !complete && <small>{answers.length}/{documentQuestions.length}</small>}
              </div>;
            })}
          </nav>
        )}
        <Conversation className="single-conversation">
          <ConversationContent className={`single-transcript ${!topic ? "empty-transcript" : ""}`}>
            {!topic && (
              <section className="chat-welcome">
                <div className="welcome-emblem"><img className="welcome-mark" src={mark} width={48} height={56} alt="" /></div>
                <h1>Make room for your next idea.</h1>
                <p className="intro">Your next paper starts with one idea.</p>
                <div className="chat-starters">
                  {[
                    {
                      icon: FlaskConical,
                      label: "Research paper",
                      topic: "AI in modern healthcare",
                    },
                    {
                      icon: BookOpen,
                      label: "Assignment",
                      topic: "Technology and the future of learning",
                    },
                    { icon: Leaf, label: "Project report", topic: "Sustainable energy solutions" },
                    {
                      icon: BriefcaseBusiness,
                      label: "Case study",
                      topic: "Digital marketing and consumer behavior",
                    },
                  ].map((idea, i) => (
                    <Button
                      key={idea.label}
                      variant="tile"
                      className="idea-card"
                      data-tone={i}
                      onClick={() => {
                        setDraft(idea.topic);
                        textareaRef.current?.focus();
                      }}
                    >
                      <span className="idea-icon">
                        <idea.icon className="size-4" />
                      </span>
                      <span className="idea-copy"><strong>{idea.label}</strong><small>{idea.topic}</small></span>
                      <ArrowUpRight className="starter-arrow" />
                    </Button>
                  ))}
                </div>
                <div className="welcome-process">
                  <span><Pencil />Topic</span>
                  <span><SlidersHorizontal />Preferences</span>
                  <span><FileText />Document</span>
                </div>
              </section>
            )}
            {topic && (
              <>
                <Message from="user">
                  <MessageContent className="bg-primary text-primary-foreground">
                    {topic}
                  </MessageContent>
                </Message>
                {answers.slice(0, editing ?? answers.length).map((answer, i) => (
                  <div className="question-turn" key={documentQuestions[i]?.key ?? i}>
                    <Assistant>
                      <MessageResponse>{documentQuestions[i]?.prompt ?? ""}</MessageResponse>
                    </Assistant>
                    <Message from="user">
                      <IconButton
                        label={`Edit ${documentQuestions[i]?.label.toLowerCase()}`}
                        onClick={() => editAnswer(i)}
                      >
                        <Pencil />
                      </IconButton>
                      <MessageContent className="bg-primary text-primary-foreground">
                        {answer}
                      </MessageContent>
                    </Message>
                  </div>
                ))}
                {question && !thinking && (
                  <Assistant>
                    <div className="question-label">
                      {editing !== null
                        ? "Editing answer"
                        : `${index + 1} of ${documentQuestions.length}`}
                    </div>
                    <MessageResponse>{question.prompt}</MessageResponse>
                    {question.key === "pages" && (
                      <div className="page-count-control">
                        <div className="page-count-label">
                          <span>Document length</span>
                          <output>
                            {/^\d+$/.test(draft) && Number(draft) >= MIN_PAGES && Number(draft) <= MAX_PAGES
                              ? draft
                              : (answers[index] ?? question.defaultValue)}{" "}
                            pages
                          </output>
                        </div>
                        <Slider
                          aria-label="Number of pages"
                          min={2}
                          max={40}
                          step={1}
                          value={[
                            Math.min(
                              40,
                              Math.max(
                                2,
                                /^\d+$/.test(draft)
                                  ? Number(draft)
                                  : Number(answers[index] ?? question.defaultValue),
                              ),
                            ),
                          ]}
                          onValueChange={(values) => {
                            const value = values[0];
                            if (value !== undefined) {
                              setDraft(String(value));
                              setError("");
                            }
                          }}
                        />
                        <div className="page-count-limits">
                          <span>2</span>
                          <span>40</span>
                        </div>
                        {customPages ? (
                          <div className="custom-pages">
                            <input
                              type="number"
                              min={MIN_PAGES}
                              max={MAX_PAGES}
                              aria-label="Custom number of pages"
                              placeholder={`${MIN_PAGES}–${MAX_PAGES}`}
                              value={draft}
                              onChange={(e) => {
                                setDraft(e.target.value);
                                setError("");
                              }}
                            />
                            <span className="field-note">pages (up to {MAX_PAGES})</span>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setCustomPages(true)}>
                            Custom page count
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => respond(draft || answers[index] || question.defaultValue)}
                        >
                          Confirm pages
                        </Button>
                      </div>
                    )}
                    {question.choices.length > 0 && (
                      <div className="answer-choices">
                        {question.choices.map((choice) => (
                          <Button
                            key={choice}
                            variant="outline"
                            size="sm"
                            onClick={() => respond(choice)}
                          >
                            {choice}
                          </Button>
                        ))}
                      </div>
                    )}
                    <div className="question-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => respond(question.defaultValue)}
                      >
                        {question.key === "instructions" ? "Skip" : `Use ${question.defaultValue}`}
                      </Button>
                      {editing !== null && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(null);
                            setDraft("");
                            setError("");
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </Assistant>
                )}
                {complete && (
                  <>
                    <Assistant>
                      <MessageResponse>
                        Your preferences are ready. Review the outline, then create your document.
                      </MessageResponse>
                    </Assistant>
                    <section className="inline-outline">
                      <div className="outline-heading">
                        <div className="section-label">
                          <ListOrdered className="size-4" />
                          Outline
                        </div>
                        <span className="outline-meta">
                          {answers[1]} pages · {answers[2]}
                        </span>
                      </div>
                      {sections.map((section, i) => (
                        <div key={i}>
                          <div className={`outline-section ${section.subsections.length ? "has-subs" : ""}`}>
                            <span className="outline-index">{String(i + 1).padStart(2, "0")}</span>
                            <input
                              aria-label={`Section ${i + 1}`}
                              value={section.title}
                              disabled={writing}
                              onChange={(e) =>
                                changeSections(
                                  sections.map((x, j) => (i === j ? { ...x, title: e.target.value } : x)),
                                )
                              }
                            />
                            <div className="section-tools">
                              <IconButton
                                label={`Add subsection to section ${i + 1}`}
                                disabled={writing}
                                onClick={() =>
                                  changeSections(
                                    sections.map((x, j) =>
                                      i === j ? { ...x, subsections: [...x.subsections, "New subsection"] } : x,
                                    ),
                                  )
                                }
                              >
                                <Plus />
                              </IconButton>
                              <IconButton
                                label={`Move section ${i + 1} up`}
                                disabled={i === 0 || writing}
                                onClick={() => moveSection(i, -1)}
                              >
                                <ArrowUp />
                              </IconButton>
                              <IconButton
                                label={`Move section ${i + 1} down`}
                                disabled={i === sections.length - 1 || writing}
                                onClick={() => moveSection(i, 1)}
                              >
                                <ArrowDown />
                              </IconButton>
                              <IconButton
                                label={`Remove section ${i + 1}`}
                                disabled={writing}
                                onClick={() => changeSections(sections.filter((_, j) => j !== i))}
                              >
                                <X />
                              </IconButton>
                            </div>
                          </div>
                          {section.subsections.length > 0 && (
                            <div className="outline-subs">
                              {section.subsections.map((sub, k) => (
                                <div className="outline-sub" key={k}>
                                  <span>
                                    {i + 1}.{k + 1}
                                  </span>
                                  <input
                                    aria-label={`Subsection ${i + 1}.${k + 1}`}
                                    value={sub}
                                    disabled={writing}
                                    onChange={(e) =>
                                      changeSections(
                                        sections.map((x, j) =>
                                          i === j
                                            ? {
                                                ...x,
                                                subsections: x.subsections.map((y, m) =>
                                                  m === k ? e.target.value : y,
                                                ),
                                              }
                                            : x,
                                        ),
                                      )
                                    }
                                  />
                                  <IconButton
                                    label={`Remove subsection ${i + 1}.${k + 1}`}
                                    disabled={writing}
                                    onClick={() =>
                                      changeSections(
                                        sections.map((x, j) =>
                                          i === j
                                            ? { ...x, subsections: x.subsections.filter((_, m) => m !== k) }
                                            : x,
                                        ),
                                      )
                                    }
                                  >
                                    <X />
                                  </IconButton>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="outline-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={writing || thinking}
                          onClick={() => changeSections([...sections, { title: "New section", subsections: [] }])}
                        >
                          <Plus />
                          Add section
                        </Button>
                        <div className="outline-utilities">
                          <IconButton
                            label="Undo outline change"
                            disabled={!previousSections || writing}
                            onClick={() => {
                              if (previousSections) {
                                setSections(previousSections);
                                setPreviousSections(null);
                                setCopied(false);
                              }
                            }}
                          >
                            <Undo2 />
                          </IconButton>
                          <IconButton
                            label={copied ? "Copied" : "Copy outline"}
                            disabled={!sections.length}
                            onClick={copy}
                          >
                            {copied ? <Check /> : <Copy />}
                          </IconButton>

                        </div>
                      </div>
                      <div className="generate-action">
                        {writing ? (
                          <Button variant="outline" onClick={stopWriting}>
                            <Square />
                            Stop writing
                          </Button>
                        ) : (
                          <Button
                            onClick={() => generateDocument(!writingComplete && (resumeTask > 0 || progress.total > 0))}
                            disabled={thinking || !sections.length}
                          >
                            <BookOpen />
                            {!writingComplete && progress.total > 0 ? "Continue writing" : generatedDocument ? "Rewrite full document" : "Create full document"}
                          </Button>
                        )}
                        {writing && (
                          <>
                            <div className="writing-status" role="status" aria-live="polite">
                              <div className="writing-status-heading"><WorkspaceLoader paused={!!retryStatus} /><strong>{retryStatus ? `Retry ${retryStatus.attempt}/3 in ${retryStatus.seconds}s` : progress.label}</strong><span>{progress.done}/{progress.total}</span></div>
                              <progress className="writing-meter" aria-label="Writing progress" value={progress.done} max={Math.max(1, progress.total)} />
                              <small>{retryStatus ? "Waiting for the writing service. Completed text is kept." : "Writing the next part…"}</small>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShowGame(!showGame)}><Coffee />{showGame ? "Hide break" : "Take a little break"}</Button>
                            {showGame && <MemoryGame />}
                          </>
                        )}
                      </div>
                    </section>
                  </>
                )}
                {generatedDocument && (
                  <Assistant>
                    <div className="section-label">
                      <FileText className="size-4" />
                      {writing ? "Writing your document…" : "Your document"}
                    </div>
                    <MessageResponse>{generatedDocument}</MessageResponse>
                    {!writing && (
                      <>
                        <div className="quality-row field-note">
                          <span>{wordCount.toLocaleString()} words</span>
                          <span>≈ {Math.max(1, Math.round(wordCount / (targetWords(answers) / Math.max(1, Number(answers[1]) - (answers[6] === "Yes" ? 1 : 0)) || 350)))} pages</span>
                          <span>
                            {writtenSections} of {sections.length} sections written
                          </span>
                        </div>
                        {answers[6] !== "No" && (
                          <fieldset className="cover-form">
                            <legend>Cover page details{attachment ? " — your uploaded layout will be followed" : ""}</legend>
                            {([
                              ["institution", "College / School name"],
                              ["name", "Name"],
                              ["className", "Class / Course"],
                              ["roll", "Roll No. / Registration No."],
                            ] as const).map(([k, label]) => (
                              <label key={k}>
                                <span>{label}</span>
                                <input value={cover[k]} onChange={(e) => { setCover({ ...cover, [k]: e.target.value }); setCoverLayout(null); }} />
                              </label>
                            ))}
                            <label className="cover-extra">
                              <span>More fields (one per line, e.g. "Guide: Dr. Sharma")</span>
                              <textarea rows={3} value={cover.extra} onChange={(e) => { setCover({ ...cover, extra: e.target.value }); setCoverLayout(null); }} />
                            </label>
                          </fieldset>
                        )}
                        <div className="export-row">
                          <Button onClick={buildPdf} disabled={building}>
                            {building ? <WorkspaceLoader className="loader-compact" /> : <Download />}
                            {building ? "Building PDF…" : "Download PDF"}
                          </Button>
                          <Button variant="outline" onClick={downloadTex}>
                            <FileCode2 />
                            LaTeX source (.tex)
                          </Button>
                          <Button variant="outline" onClick={addPages} disabled={thinking || !writingComplete}>
                            <Plus />
                            {extraRemaining ? "Continue extra pages" : "Add 2 more pages"}
                          </Button>
                        </div>
                        {pdfUrl && (
                          <iframe className="pdf-preview" src={pdfUrl} title="PDF preview" />
                        )}
                        {pdfData && (
                          <div className="mail-form">
                            <strong>Send the PDF to your email</strong>
                            <div className="mail-row">
                              <input type="email" placeholder="you@example.com" aria-label="Email address" value={mail.to} onChange={(e) => setMail({ ...mail, to: e.target.value })} />
                              <select aria-label="Email style" value={mail.template} onChange={(e) => setMail({ ...mail, template: e.target.value as EmailTemplate })}>
                                {EMAIL_TEMPLATES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} style</option>)}
                              </select>
                              <Button onClick={emailPdf} disabled={sending}>{sending ? <WorkspaceLoader className="loader-compact" /> : <Mail />}{sending ? "Sending…" : "Send PDF"}</Button>
                            </div>
                            {mailStatus && <small role="status">{mailStatus}</small>}
                          </div>
                        )}
                      </>
                    )}
                  </Assistant>
                )}
                {followups.map((message, i) =>
                  message.role === "assistant" ? (
                    <Assistant key={i}>
                      <MessageResponse>{message.content}</MessageResponse>
                    </Assistant>
                  ) : (
                    <Message key={i} from="user">
                      <MessageContent className="bg-primary text-primary-foreground">
                        {message.content}
                      </MessageContent>
                    </Message>
                  ),
                )}
                {thinking && (
                  <Assistant>
                    <div role="status" aria-live="polite" className="thinking-status">
                      <WorkspaceLoader paused={!!retryStatus} />
                      <span>{retryStatus ? `Retry ${retryStatus.attempt}/3 in ${retryStatus.seconds}s…` : "Thinking…"}</span>
                      <IconButton label="Stop request" onClick={stopWriting}><Square /></IconButton>
                    </div>
                  </Assistant>
                )}
                {error && complete && !sections.length && !thinking && (
                  <Button variant="outline" size="sm" onClick={() => buildStructure(answers)}>
                    Retry structure
                  </Button>
                )}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <footer className="chat-composer-wrap">
          <div className="chat-composer-inner">
            {(thinking || writing || building || sending) && (
              <div className="composer-activity" role="status" aria-live="polite">
                <WorkspaceLoader />
                <div>
                  <strong>{sending ? "Sending PDF…" : building ? "Preparing PDF…" : retryStatus ? `Retry ${retryStatus.attempt}/3 in ${retryStatus.seconds}s…` : writing ? "Writing your document…" : "Thinking…"}</strong>
                  {writing && <span>{progress.label} · {progress.done}/{progress.total}</span>}
                </div>
                {(thinking || writing) && <IconButton label="Stop" onClick={stopWriting}><Square /></IconButton>}
              </div>
            )}
            {error && (
              <div role="alert" className="chat-error recovery-notice">
                <span>{error}</span>
                {complete && !thinking && !writing && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (!sections.length) void buildStructure(answers);
                    else if (extraRemaining) void addPages();
                    else if (!writingComplete && progress.total > 0) void generateDocument(true);
                    else {
                      const latest = [...followups].reverse().find((m) => m.role === "user");
                      if (latest) void runAI("Respond to the latest user request about this document.", [...history, latest]).then((text) => { if (text) setFollowups((old) => [...old, { role: "assistant", content: text }]); });
                      else void buildStructure(answers);
                    }
                  }}><RotateCcw />Try again</Button>
                )}
              </div>
            )}
            <PromptInput
              className="composer"
              onSubmit={(m) =>
                respond(
                  m.text ||
                    draft ||
                    (question?.key === "pages" ? (answers[index] ?? question.defaultValue) : ""),
                )
              }
            >
              <PromptInputTextarea
                ref={textareaRef}
                aria-label={
                  complete ? "Message about document" : topic ? "Your answer" : "Document topic"
                }
                disabled={thinking || writing}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError("");
                }}
                placeholder={
                  complete
                    ? "Ask for changes or continue writing…"
                    : !topic
                      ? "Enter your topic…"
                      : question?.key === "pages"
                        ? "Number of pages…"
                        : question?.key === "instructions"
                          ? "Add any requirements…"
                          : "Your answer…"
                }
              />
              <PromptInputFooter className="composer-footer">
                <div className="composer-footer-left">
                  <IconButton
                    label="Attach reference notes"
                    onClick={() => fileRef.current?.click()}
                    disabled={thinking || writing}
                  >
                    <Paperclip />
                  </IconButton>
                  {attachment && (
                    <>
                      <span className="attachment-name">{attachment.name}</span>
                      <IconButton label="Remove attachment" onClick={() => setAttachment(null)}>
                        <X />
                      </IconButton>
                    </>
                  )}
                  {question?.key === "pages" && topic && (
                    <span className="composer-hint">{MIN_PAGES}–{MAX_PAGES} pages</span>
                  )}
                </div>
                <PromptInputSubmit
                  status={thinking ? "submitted" : "ready"}
                  disabled={thinking || writing || (!draft.trim() && question?.key !== "pages")}
                  className="composer-submit"
                  aria-label={complete ? "Send message" : topic ? "Send answer" : "Send topic"}
                >
                  {thinking ? undefined : <ArrowUp />}
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md"
              className="hidden"
              aria-label="Reference notes"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 100000) {
                  setError("Choose reference notes smaller than 100 KB.");
                  return;
                }
                setAttachment({ name: file.name, text: await file.text() });
                e.target.value = "";
              }}
            />
            <p className="chat-footer-note">Check facts and references before submitting.</p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
