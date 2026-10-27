export type Dock = { edge: "left" | "right" | "top" | "bottom"; position: number };
export const defaultDock: Dock = { edge: "right", position: 0.25 };
export function dockToEdge(x: number, y: number, width: number, height: number): Dock {
  const distances = [x, width - x, y, height - y];
  const edges = ["left", "right", "top", "bottom"] as const;
  const edge = edges[distances.indexOf(Math.min(...distances))] ?? "right";
  const vertical = edge === "left" || edge === "right";
  const length = Math.max(48, vertical ? height : width);
  const coordinate = vertical ? y : x;
  return { edge, position: Math.max(24 / length, Math.min(1 - 24 / length, coordinate / length)) };
}
export function parseDock(value: unknown): Dock {
  if (!value || typeof value !== "object") return { ...defaultDock };
  const dock = value as Partial<Dock>;
  if (!["left", "right", "top", "bottom"].includes(dock.edge ?? "") || typeof dock.position !== "number" || !Number.isFinite(dock.position)) return { ...defaultDock };
  return { edge: dock.edge ?? "right", position: Math.max(0, Math.min(1, dock.position)) };
}