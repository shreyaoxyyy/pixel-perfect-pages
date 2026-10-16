import { useRef } from "react";
import { ArrowDown, ArrowUp, GripVertical, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { documentBlocks, isReferences, moveDocumentBlock } from "@/lib/document-order";

export function DocumentPageOrder({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const list = useRef<HTMLDivElement>(null);
  const dragged = useRef<number | null>(null);
  const blocks = documentBlocks(value);
  return <div className="document-page-order" ref={list}>
    <h3>Document order</h3>
    {blocks.map((block, index) => <div className="page-order-row" data-page-index={index} key={`${index}-${block.title}`}>
      <Button variant="ghost" size="icon-sm" className="page-drag-handle" aria-label={`Drag ${block.title}`} title={`Move ${block.title}`} disabled={isReferences(block.title)}
        onPointerDown={(e) => { dragged.current = index; e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.closest(".page-order-row")?.setAttribute("data-dragging", "true"); }}
        onPointerMove={(e) => { if (dragged.current === null) return; const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-page-index]"); list.current?.querySelectorAll("[data-drop-target]").forEach((row) => row.removeAttribute("data-drop-target")); target?.setAttribute("data-drop-target", "true"); }}
        onPointerUp={(e) => { const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-page-index]"); const to = Number(target?.getAttribute("data-page-index")); if (target && dragged.current !== null) onChange(moveDocumentBlock(value, dragged.current, to)); dragged.current = null; list.current?.querySelectorAll("[data-dragging], [data-drop-target]").forEach((row) => { row.removeAttribute("data-dragging"); row.removeAttribute("data-drop-target"); }); }}
        onPointerCancel={() => { dragged.current = null; list.current?.querySelectorAll("[data-dragging], [data-drop-target]").forEach((row) => { row.removeAttribute("data-dragging"); row.removeAttribute("data-drop-target"); }); }}>
        {isReferences(block.title) ? <Lock /> : <GripVertical />}
      </Button>
      <span className="page-order-title">{block.title}{block.added && <small>Added page</small>}</span>
      <div className="page-order-actions">
        <Button variant="ghost" size="icon-sm" aria-label={`Move ${block.title} up`} disabled={index === 0 || isReferences(block.title)} onClick={() => onChange(moveDocumentBlock(value, index, index - 1))}><ArrowUp /></Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Move ${block.title} down`} disabled={index >= blocks.length - 1 || isReferences(block.title) || isReferences(blocks[index + 1]?.title ?? "")} onClick={() => onChange(moveDocumentBlock(value, index, index + 1))}><ArrowDown /></Button>
      </div>
    </div>)}
  </div>;
}