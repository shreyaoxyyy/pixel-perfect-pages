import { describe, expect, it } from "vitest";
import { parseDeepSeekResponse, extractSections } from "./deepseek-response";
describe("DeepSeek integration", () => {
  it("reads the requested API's nested response", () => {
    expect(parseDeepSeekResponse({ status: true, data: { response: "Hello" } })).toBe("Hello");
  });
  it("rejects empty or failed responses instead of displaying a fake answer", () => {
    expect(() => parseDeepSeekResponse({ status: false })).toThrow();
    expect(() => parseDeepSeekResponse({ status: true, data: { response: "" } })).toThrow();
  });
  it("rejects the Ansh API's HTTP 200 envelope containing an upstream 403 failure", () => {
    expect(() => parseDeepSeekResponse({ status: true, data: { response: '[CodAGT] Upstream produced no output — create-chat: upstream create-chat HTTP 403 {"error":{"message":"Forbidden"}}' } })).toThrow("upstream failure");
  });
  it("extracts editable headings from a real outline", () => {
    expect(extractSections("## Introduction\nDescription\n## Discussion")).toEqual([
      "Introduction",
      "Discussion",
    ]);
  });
});
