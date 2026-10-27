export const themes = [
  { id: "studio", name: "Studio", subtitle: "Fresh & focused" },
  { id: "ocean", name: "Ocean", subtitle: "Clear blue thinking" },
  { id: "rose", name: "Rose", subtitle: "A softer perspective" },
  { id: "citrus", name: "Citrus", subtitle: "Bright ideas" },
  { id: "ink", name: "Ink", subtitle: "After-hours focus" },
  { id: "forest", name: "Forest", subtitle: "Deep, quiet greens" },
  { id: "cherry", name: "Cherry", subtitle: "A bold little spark" },
  { id: "mono", name: "Monochrome", subtitle: "Just the essentials" },
  { id: "porcelain", name: "Porcelain", subtitle: "Cobalt & clean paper" },
  { id: "graphite", name: "Graphite", subtitle: "Charcoal & warm gold" },
] as const;
export type Appearance = {
  theme: string;
  font: string;
  size: number;
  compact: boolean;
  motion: boolean;
  focus: boolean;
  wide: boolean;
  relaxed: boolean;
};
export const defaultAppearance: Appearance = {
  theme: "studio",
  font: "sans",
  size: 14,
  compact: false,
  motion: true,
  focus: false,
  wide: false,
  relaxed: false,
};
export function parseAppearance(raw: string | null): Appearance {
  try {
    const v = JSON.parse(raw ?? "null");
    if (!v || typeof v !== "object") return { ...defaultAppearance };
    return {
      theme: themes.some((t) => t.id === v.theme) ? v.theme : "studio",
      font: ["sans", "serif", "mono"].includes(v.font) ? v.font : "sans",
      size: [14, 15, 16, 17, 18].includes(v.size) ? v.size : 14,
      compact: v.compact === true,
      motion: v.motion !== false,
      focus: v.focus === true,
      wide: v.wide === true,
      relaxed: v.relaxed === true,
    };
  } catch {
    return { ...defaultAppearance };
  }
}
