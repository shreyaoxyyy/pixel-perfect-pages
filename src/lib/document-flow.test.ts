import { describe, expect, it } from "vitest";
import { documentQuestions, recordAnswer, validateAnswer } from "./document-flow";

describe("one-at-a-time document questions", () => {
  it("starts with document type and advances one question per answer", () => {
    expect(documentQuestions[0].key).toBe("type");
    const answers = recordAnswer([], "Assignment");
    expect(answers).toEqual(["Assignment"]);
    expect(documentQuestions[answers.length]?.key).toBe("pages");
    expect(documentQuestions[recordAnswer(answers, "7").length]?.key).toBe("citation");
  });
  it("does not advance for an invalid answer", () => {
    expect(recordAnswer(["Assignment"], "abc")).toEqual(["Assignment"]);
    expect(validateAnswer(0, "unknown")).not.toBeNull();
  });
  it("collects all preferences before completing", () => {
    const answers = documentQuestions.reduce<string[]>(
      (all, q) => recordAnswer(all, q.defaultValue),
      [],
    );
    expect(answers).toHaveLength(8);
    expect(answers[6]).toBe("Yes");
    expect(answers[7]).toBe("No additional instructions");
  });
});

describe("page limit", () => {
  it("accepts custom page counts beyond the 40-page slider up to 200", () => {
    expect(validateAnswer(1, "75")).toBeNull();
    expect(validateAnswer(1, "200")).toBeNull();
    expect(validateAnswer(1, "201")).not.toBeNull();
    expect(validateAnswer(1, "0")).not.toBeNull();
  });
});
