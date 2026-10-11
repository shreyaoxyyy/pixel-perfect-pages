import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Compiles LaTeX source to PDF with the public TeX Live compile service (XeLaTeX). */
export const compileLatex = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ tex: z.string().min(20).max(800000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const form = new FormData();
    form.append("filecontents[]", data.tex);
    form.append("filename[]", "document.tex");
    form.append("engine", "xelatex");
    form.append("return", "pdf");
    try {
      const response = await fetch("https://texlive.net/cgi-bin/latexcgi", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(110000),
      });
      const buffer = await response.arrayBuffer();
      if (!response.ok)
        return {
          pdf: "",
          compileFailed: false,
          error: "The PDF service is unavailable right now. Please try again shortly.",
        };
      if (!(response.headers.get("content-type") ?? "").includes("pdf")) {
        const log = new TextDecoder().decode(buffer);
        console.error("LaTeX compile failed:", log.split("\n").filter((l) => l.startsWith("!")).slice(0, 3).join(" | "));
        return { pdf: "", compileFailed: true, error: "The PDF couldn't be built from this document." };
      }
      return { pdf: toBase64(buffer), compileFailed: false, error: "" };
    } catch {
      return {
        pdf: "",
        compileFailed: false,
        error: "Couldn't reach the PDF service. Your document is still here; please try again.",
      };
    }
  });
