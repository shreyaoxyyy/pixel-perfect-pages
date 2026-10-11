import { describe, expect, it } from "vitest";
import { parseAppearance } from "./appearance";

describe("appearance preferences", () => {
  it("restores a selected dark theme and font", () => {
    expect(parseAppearance('{"theme":"ink","font":"mono","size":16}')).toMatchObject({
      theme: "ink",
      font: "mono",
      size: 16,
    });
  });
  it("rejects unsupported values", () => {
    expect(parseAppearance('{"theme":"unknown","font":"unknown","size":100}')).toMatchObject({
      theme: "studio",
      font: "sans",
      size: 14,
    });
  });
  it("uses defaults for corrupted settings", () => {
    expect(parseAppearance("{").theme).toBe("studio");
  });
});
