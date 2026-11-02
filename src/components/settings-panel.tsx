import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  Settings, Maximize2, AlignJustify, RotateCcw, Download, CheckCircle2, Share, Sun, Bell,
  Volume2, Square, Copy, Printer, FileText, Clock, Hash, Contrast, BookOpen, Trash2, Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { dockToEdge, defaultDock, parseDock, type Dock } from "@/lib/settings";

type Prefs = { wide: boolean; relaxed: boolean; awake: boolean; notify: boolean; contrast: boolean; readable: boolean };
const defaultPrefs: Prefs = { wide: false, relaxed: false, awake: false, notify: false, contrast: false, readable: false };

function documentText() {
  const el = document.querySelector(".single-transcript");
  return (el as HTMLElement | null)?.innerText.trim() ?? "";
}

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [dock, setDock] = useState<Dock>(defaultDock);
  const [dragging, setDragging] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [ready, setReady] = useState(false);
  const [installEvent, setInstallEvent] = useState<{ prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [note, setNote] = useState("");
  const [stats, setStats] = useState({ words: 0, chars: 0, minutes: 0 });
  const [speaking, setSpeaking] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const suppressClick = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("scriptorium-settings-v1") ?? "null");
      if (saved) {
        setDock(parseDock(saved.dock));
        setPrefs(Object.fromEntries(Object.keys(defaultPrefs).map((k) => [k, saved[k] === true])) as Prefs);
      }
    } catch { /* Optional device preferences. */ }
    setReady(true);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvent(e as unknown as NonNullable<typeof installEvent>); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    const onReady = () => {
      if (!prefsRef.current.notify || typeof Notification === "undefined" || Notification.permission !== "granted") return;
      if (document.visibilityState === "visible") return;
      try { new Notification("Your document is ready", { body: "Scriptorium finished writing. Tap to review and download the PDF.", icon: "/icon-192.png" }); } catch { /* Some browsers block page notifications. */ }
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("scriptorium:document-ready", onReady);
    return () => {
      if (hold.current) clearTimeout(hold.current);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("scriptorium:document-ready", onReady);
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset["wide"] = String(prefs.wide);
    root.dataset["relaxed"] = String(prefs.relaxed);
    root.dataset["contrast"] = String(prefs.contrast);
    root.dataset["readable"] = String(prefs.readable);
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

  useEffect(() => {
    if (!open) return;
    const text = documentText();
    const words = text ? text.split(/\s+/).length : 0;
    setStats({ words, chars: text.length, minutes: Math.max(words ? 1 : 0, Math.round(words / 200)) });
    setNote("");
  }, [open]);

  const flash = (message: string) => setNote(message);
  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallEvent(null);
      return;
    }
    flash(ios ? "Safari mein Share button dabao, phir \"Add to Home Screen\" chuno." : "Browser menu (⋮) kholo aur \"Install app\" ya \"Add to Home screen\" chuno.");
  };
  const toggleNotify = async (on: boolean) => {
    if (!on) return setPrefs((s) => ({ ...s, notify: false }));
    if (typeof Notification === "undefined") return flash("Ye browser notifications support nahi karta.");
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") return flash("Notifications allow nahi hui — browser settings se allow karo.");
    setPrefs((s) => ({ ...s, notify: true }));
    flash("Document ready hote hi notification milega, chahe aap doosre tab mein ho.");
  };
  const readAloud = () => {
    const synth = window.speechSynthesis;
    if (!synth) return flash("Ye browser read-aloud support nahi karta.");
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const text = documentText();
    if (!text) return flash("Abhi padhne ke liye koi document nahi hai.");
    const u = new SpeechSynthesisUtterance(text.slice(0, 30000));
    u.rate = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };
  const copyAll = async () => {
    const text = documentText();
    if (!text) return flash("Copy karne ke liye abhi kuch nahi hai.");
    try { await navigator.clipboard.writeText(text); flash("Poora text copy ho gaya."); } catch { flash("Copy nahi ho paya — browser ne permission nahi di."); }
  };
  const downloadText = () => {
    const text = documentText();
    if (!text) return flash("Download ke liye abhi kuch nahi hai.");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "scriptorium-document.txt" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const clearData = () => {
    if (!window.confirm("Saari saved settings aur appearance is device se hata dein?")) return;
    try { localStorage.removeItem("scriptorium-settings-v1"); localStorage.removeItem("scriptorium-appearance-v2"); } catch { /* ignore */ }
    window.location.reload();
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
  const toggles: { key: keyof Prefs; label: string; detail: string; icon: typeof Sun }[] = [
    { key: "wide", label: "Wide reading area", detail: "Roomier document view", icon: Maximize2 },
    { key: "relaxed", label: "Relaxed line spacing", detail: "Easier to read long pages", icon: AlignJustify },
    { key: "readable", label: "Easy-read text", detail: "Bigger letter spacing for tired eyes", icon: BookOpen },
    { key: "contrast", label: "High contrast", detail: "Sharper text on every theme", icon: Contrast },
    { key: "awake", label: "Keep screen on", detail: "Screen won't sleep while writing", icon: Sun },
  ];

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
      <Settings strokeWidth={1.6} />
    </Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side={dock.edge === "left" ? "left" : "right"} className="appearance-panel settings-sheet">
        <div className="panel-title"><div><SheetTitle>Settings</SheetTitle><SheetDescription>Tools for writing, reading & sharing</SheetDescription></div></div>

        <div className="settings-stats" aria-label="Document stats">
          <div><FileText /><b>{stats.words.toLocaleString()}</b><small>words</small></div>
          <div><Clock /><b>{stats.minutes}</b><small>min read</small></div>
          <div><Hash /><b>{Math.ceil(stats.words / 450)}</b><small>pages</small></div>
        </div>

        <h3 className="settings-section-title">Document tools</h3>
        <div className="settings-actions">
          <Button variant="outline" onClick={readAloud}>{speaking ? <Square /> : <Volume2 />}{speaking ? "Stop" : "Read aloud"}</Button>
          <Button variant="outline" onClick={copyAll}><Copy /> Copy text</Button>
          <Button variant="outline" onClick={downloadText}><Download /> Save .txt</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
        </div>
        {note && <p className="install-note" role="status">{note}</p>}

        <h3 className="settings-section-title">App</h3>
        <div className="settings-install">
          {installed ? <p className="install-done"><CheckCircle2 /> Scriptorium is installed on this device</p> : <>
            <Button className="w-full" onClick={install}>{ios ? <Share /> : <Download />} Install app</Button>
            <small>Android, iPhone aur desktop par app ki tarah kholo.</small>
          </>}
        </div>
        <div className="layout-options">
          <label className="preference-row"><span className="settings-row-icon"><Bell /></span><span>Notify when ready<small>Alert when your document finishes</small></span><Switch aria-label="Notify when ready" checked={prefs.notify} onCheckedChange={toggleNotify} /></label>
        </div>

        <h3 className="settings-section-title">Reading</h3>
        <div className="layout-options">
          {toggles.map((p) => <label key={p.key} className="preference-row"><span className="settings-row-icon"><p.icon /></span><span>{p.label}<small>{p.detail}</small></span><Switch aria-label={p.label} checked={prefs[p.key]} onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))} /></label>)}
        </div>

        <p className="timer-state"><Keyboard /> Enter se bhejo, Shift+Enter se nayi line. Settings button ko hold karke side par le ja sakte ho.</p>
        <div className="settings-footer">
          <Button variant="ghost" className="reset-appearance" onClick={() => { setPrefs(defaultPrefs); setDock(defaultDock); }}><RotateCcw /> Reset</Button>
          <Button variant="ghost" className="reset-appearance" onClick={clearData}><Trash2 /> Clear device data</Button>
        </div>
      </SheetContent>
    </Sheet>
  </>;
}
