import { cn } from "@/lib/utils";

/** A stable, decorative document glyph; its parent owns the live status text. */
export function WorkspaceLoader({ className, paused = false }: { className?: string; paused?: boolean }) {
  return (
    <span className={cn("workspace-loader", className)} data-paused={paused} aria-hidden="true">
      <span className="loader-sheet"><i /><i /><i /></span>
      <span className="loader-track" />
    </span>
  );
}