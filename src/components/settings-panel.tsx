import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Settings, Settings2, Maximize2, AlignJustify, Lightbulb, Timer, Play, Pause, RotateCcw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { dockToEdge, defaultDock, parseDock, type Dock } from "@/lib/settings";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [dock, setDock] = useState<Dock>(defaultDock);
  const [dragging, setDragging] = useState(false);
  const [prefs, setPrefs] = useState({ wide: false, relaxed: false, hideStarters: false });
  const [ready, setReady] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const suppressClick = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("scriptorium-settings-v1") ?? "null");
      if (saved) {
        setDock(parseDock(saved.dock));
        setPrefs({ wide: saved.wide === true, relaxed: saved.relaxed === true, hideStarters: saved.hideStarters === true });
      }
    } catch { /* Optional device preferences. */ }
    setReady(true);
    return () => { if (hold.current) clearTimeout(hold.current); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset["wide"] = String(prefs.wide);
    root.dataset["relaxed"] = String(prefs.relaxed);
    root.dataset["hideStarters"] = String(prefs.hideStarters);
    try { localStorage.setItem("scriptorium-settings-v1", JSON.stringify({ ...prefs, dock })); } catch { /* Optional device preferences. */ }
  }, [prefs, dock, ready]);
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [running]);
  useEffect(() => { if (seconds === 0) setRunning(false); }, [seconds]);
  const clearHold = () => { if (hold.current) clearTimeout(hold.current); hold.current = null; };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (!active.current) {
      if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) clearHold();
      return;
    }
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    setDock(dockToEdge(event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height));
  };
  const end = () => { clearHold(); active.current = false; setDragging(false); };
  const vertical = dock.edge === "left" || dock.edge === "right";
  return <>
    <Button variant="ghost" size="icon" className="settings-edge-trigger" data-edge={dock.edge} data-dragging={dragging} aria-label="Settings" title="Settings — hold to move"
      style={vertical ? { top: `${dock.position * 100}%` } : { left: `${dock.position * 100}%` }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        suppressClick.current = false;
        start.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        clearHold();
        hold.current = setTimeout(() => { active.current = true; suppressClick.current = true; setDragging(true); }, 350);
      }} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setOpen(true); }}>
      <Settings strokeWidth={1.7} />
    </Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side={dock.edge === "left" ? "left" : "right"} className="appearance-panel settings-sheet">
        <div className="panel-title"><div><span className="settings-eyebrow"><Settings2 /> YOUR WORKSPACE</span><SheetTitle>Settings</SheetTitle><SheetDescription>Reading & concentration</SheetDescription></div></div>
        <h3 className="settings-section-title">Reading</h3>
        <div className="layout-options">
          {[
            { key: "wide", label: "Wide reading area", detail: "Roomier document view", icon: Maximize2 },
            { key: "relaxed", label: "Relaxed line spacing", detail: "More space between lines", icon: AlignJustify },
            { key: "hideStarters", label: "Hide starter suggestions", detail: "A quieter welcome screen", icon: Lightbulb },
          ].map((p) => <label key={p.key} className="preference-row"><span className="settings-row-icon"><p.icon /></span><span>{p.label}<small>{p.detail}</small></span><Switch aria-label={p.label} checked={prefs[p.key as keyof typeof prefs]} onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))} /></label>)}
        </div>
        <h3 className="settings-section-title"><Timer /> Focus timer</h3>
        <div className="settings-timer"><span className="timer-digits" role="timer" aria-label="Focus time remaining">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span><div className="flex gap-2"><Button variant="outline" size="icon" aria-label={running ? "Pause focus timer" : "Start focus timer"} title={running ? "Pause" : "Start"} disabled={seconds === 0} onClick={() => setRunning((s) => !s)}>{running ? <Pause /> : <Play />}</Button><Button variant="ghost" size="icon" aria-label="Reset focus timer" title="Reset timer" onClick={() => { setRunning(false); setSeconds(25 * 60); }}><RotateCcw /></Button></div></div>
        <p className="timer-state" role="status">{seconds === 0 ? "Session complete" : running ? "Focus session in progress" : "25-minute session"}</p>
        <h3 className="settings-section-title">Button position</h3>
        <div className="settings-dock-options">{[{ edge: "left", icon: ArrowLeft }, { edge: "top", icon: ArrowUp }, { edge: "bottom", icon: ArrowDown }, { edge: "right", icon: ArrowRight }].map((item) => <Button key={item.edge} variant="outline" size="icon" title={`Dock ${item.edge}`} aria-label={`Dock settings ${item.edge}`} aria-pressed={dock.edge === item.edge} onClick={() => setDock({ edge: item.edge as Dock["edge"], position: 0.5 })}><item.icon /></Button>)}</div>
        <Button variant="ghost" className="reset-appearance" onClick={() => { setPrefs({ wide: false, relaxed: false, hideStarters: false }); setDock(defaultDock); setRunning(false); setSeconds(25 * 60); }}><RotateCcw /> Reset settings</Button>
      </SheetContent>
    </Sheet>
  </>;
}