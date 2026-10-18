export function parseDeepSeekResponse(value: unknown): string {
  if (!value || typeof value !== "object")
    throw new Error("DeepSeek returned an invalid response.");
  const root = value as Record<string, unknown>;
  const data = root["data"];
  if (root["status"] !== true || !data || typeof data !== "object")
    throw new Error("DeepSeek could not complete this request. Please try again later.");
  const response = (data as Record<string, unknown>)["response"];
  if (typeof response !== "string" || !response.trim())
    throw new Error("DeepSeek returned an empty response.");
  // This provider sometimes wraps upstream failures in a successful HTTP/JSON envelope.
  // Never render that diagnostic as academic content or a generated outline.
  if (/^\s*\[CodAGT\]|upstream produced no output|upstream create-chat HTTP\s+\d{3}/i.test(response))
    throw new Error("The writing service returned an upstream failure.");
  return response.trim();
}

export function extractSections(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^#{1,3}\s|^\d+[.)]\s/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+|^\d+[.)]\s+/, "").replace(/\*\*/g, ""))
    .filter(Boolean);
}
