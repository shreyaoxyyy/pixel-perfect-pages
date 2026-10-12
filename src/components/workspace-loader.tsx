import { cn } from "@/lib/utils";

/** A theme-aware ink rhythm; its parent owns the live status text. */
export function WorkspaceLoader({ className, paused = false }: { className?: string; paused?: boolean }) {
  return (
    <span className={cn("workspace-loader", className)} data-paused={paused} aria-hidden="true">
      <span className="loader-rhythm"><i /><i /><i /><i /><i /></span>
    </span>
  );
}