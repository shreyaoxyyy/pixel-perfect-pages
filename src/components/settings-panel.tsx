import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Settings, Settings2, Maximize2, AlignJustify, RotateCcw, Download, CheckCircle2, Share, MonitorSmartphone, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { dockToEdge, defaultDock, parseDock, type Dock } from "@/lib/settings";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [dock, setDock] = useState<Dock>(defaultDock);
  const [dragging, setDragging] = useState(false);
  const [prefs, setPrefs] = useState({ wide: false, relaxed: false, awake: false });
  const [ready, setReady] = useState(false);
  const [installEvent, setInstallEvent] = useState<{ prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [installNote, setInstallNote] = useState("");
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const suppressClick = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("scriptorium-settings-v1") ?? "null");
      if (saved) {
        setDock(parseDock(saved.dock));
        setPrefs({ wide: saved.wide === true, relaxed: saved.relaxed === true, awake: saved.awake === true });
      }
    } catch { /* Optional device preferences. */ }
    setReady(true);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvent(e as unknown as NonNullable<typeof installEvent>); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { if (hold.current) clearTimeout(hold.current); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset["wide"] = String(prefs.wide);
    root.dataset["relaxed"] = String(prefs.relaxed);

    try { localStorage.setItem("scriptorium-settings-v1", JSON.stringify({ ...prefs, dock })); } catch { /* Optional device preferences. */ }
  }, [prefs, dock, ready]);
  useEffect(() => {
    if (!prefs.awake) return;
    type Lock = { release: () => Promise<void> };
    const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<Lock> } }).wakeLock;
    if (!wl) return;
    let lock: Lock | null = null;
    const get = () => { if (document.visibilityState === "visible") wl.request("screen").then((l) => { lock = l; }).catch(() => {}); };
    get();
    document.addEventListener("visibilitychange", get);
    return () => { document.removeEventListener("visibilitychange", get); lock?.release().catch(() => {}); };
  }, [prefs.awake]);
  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallEvent(null);
      return;
    }
    setInstallNote(ios ? "Safari mein Share button dabao, phir \"Add to Home Screen\" chuno." : "Browser menu (⋮) kholo aur \"Install app\" ya \"Add to Home screen\" chuno.");
  };
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
        <h3 className="settings-section-title"><MonitorSmartphone /> App</h3>
        <div className="settings-install">
          {installed ? <p className="install-done"><CheckCircle2 /> Scriptorium is installed on this device</p> : <>
            <Button className="w-full" onClick={install}>{ios ? <Share /> : <Download />} Install app</Button>
            <small>Phone ya computer par app ki tarah kholo — Android, iPhone aur desktop.</small>
            {installNote && <p className="install-note" role="status">{installNote}</p>}
          </>}
        </div>
        <h3 className="settings-section-title">Reading</h3>
        <div className="layout-options">
          {[
            { key: "wide", label: "Wide reading area", detail: "Roomier document view", icon: Maximize2 },
            { key: "relaxed", label: "Relaxed line spacing", detail: "Easier to read long pages", icon: AlignJustify },
            { key: "awake", label: "Keep screen on", detail: "Screen won't sleep while you write", icon: Sun },
          ].map((p) => <label key={p.key} className="preference-row"><span className="settings-row-icon"><p.icon /></span><span>{p.label}<small>{p.detail}</small></span><Switch aria-label={p.label} checked={prefs[p.key as keyof typeof prefs]} onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))} /></label>)}
        </div>
        <p className="timer-state">Tip: Settings button ko hold karke kisi bhi side par le ja sakte ho.</p>
        <Button variant="ghost" className="reset-appearance" onClick={() => { setPrefs({ wide: false, relaxed: false, awake: false }); setDock(defaultDock); }}><RotateCcw /> Reset settings</Button>
      </SheetContent>
    </Sheet>
  </>;
}