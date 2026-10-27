import { describe, expect, it } from "vitest";
import { dockToEdge, parseDock } from "./settings";
describe("edge-only settings docking", () => {
  it.each([
    [10, 300, "left"], [350, 300, "right"], [180, 10, "top"], [180, 700, "bottom"],
  ])("docks (%s, %s) on the %s edge", (x, y, edge) => {
    expect(dockToEdge(Number(x), Number(y), 360, 715).edge).toBe(edge);
  });
  it("snaps a middle drop to an outer edge, never a free position", () => {
    expect(dockToEdge(180, 357, 360, 715)).toEqual({ edge: "left", position: 357 / 715 });
  });
  it("keeps the whole button within the side's bounds", () => {
    expect(dockToEdge(0, -200, 360, 715).position).toBe(24 / 715);
    expect(dockToEdge(360, 1000, 360, 715).position).toBe(1 - 24 / 715);
  });
  it("rejects stored centre placement", () => {
    expect(parseDock({ edge: "centre", position: 0.5 })).toEqual({ edge: "right", position: 0.25 });
  });
});