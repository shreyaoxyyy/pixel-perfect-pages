import { useEffect, useState } from "react";
import { Settings2, Maximize2, AlignJustify, RotateCcw, CheckCircle2, MonitorSmartphone, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useInstallPrompt } from "@/lib/use-install";
import mark from "@/assets/scriptorium-mark.png";

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [prefs, setPrefs] = useState({ wide: false, relaxed: false, awake: false });
  const [ready, setReady] = useState(false);
  const { installed, installNote, install } = useInstallPrompt();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("scriptorium-settings-v1") ?? "null");
      if (saved) {
        setPrefs({ wide: saved.wide === true, relaxed: saved.relaxed === true, awake: saved.awake === true });
      }
    } catch {
      /* Optional device preferences. */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset["wide"] = String(prefs.wide);
    root.dataset["relaxed"] = String(prefs.relaxed);
    try {
      localStorage.setItem("scriptorium-settings-v1", JSON.stringify(prefs));
    } catch {
      /* Optional device preferences. */
    }
  }, [prefs, ready]);

  useEffect(() => {
    if (!prefs.awake) return;
    type Lock = { release: () => Promise<void> };
    const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<Lock> } }).wakeLock;
    if (!wl) return;
    let lock: Lock | null = null;
    const get = () => {
      if (document.visibilityState === "visible")
        wl.request("screen")
          .then((l) => {
            lock = l;
          })
          .catch(() => {});
    };
    get();
    document.addEventListener("visibilitychange", get);
    return () => {
      document.removeEventListener("visibilitychange", get);
      lock?.release().catch(() => {});
    };
  }, [prefs.awake]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="appearance-panel settings-sheet">
        <div className="panel-title">
          <div>
            <span className="settings-eyebrow">
              <Settings2 /> YOUR WORKSPACE
            </span>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Reading & concentration</SheetDescription>
          </div>
        </div>
        <h3 className="settings-section-title">
          <MonitorSmartphone /> App
        </h3>
        <div className="settings-install">
          {installed ? (
            <p className="install-done">
              <CheckCircle2 /> Scriptorium is installed on this device
            </p>
          ) : (
            <>
              <Button className="w-full" onClick={install}>
                <img src={mark} alt="" className="install-mark" /> Install app
              </Button>
              <small>Phone ya computer par app ki tarah kholo — Android, iPhone aur desktop.</small>
              {installNote && (
                <p className="install-note" role="status">
                  {installNote}
                </p>
              )}
            </>
          )}
        </div>
        <h3 className="settings-section-title">Reading</h3>
        <div className="layout-options">
          {[
            { key: "wide", label: "Wide reading area", detail: "Roomier document view", icon: Maximize2 },
            { key: "relaxed", label: "Relaxed line spacing", detail: "Easier to read long pages", icon: AlignJustify },
            { key: "awake", label: "Keep screen on", detail: "Screen won't sleep while you write", icon: Sun },
          ].map((p) => (
            <label key={p.key} className="preference-row">
              <span className="settings-row-icon">
                <p.icon />
              </span>
              <span>
                {p.label}
                <small>{p.detail}</small>
              </span>
              <Switch
                aria-label={p.label}
                checked={prefs[p.key as keyof typeof prefs]}
                onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))}
              />
            </label>
          ))}
        </div>
        <Button
          variant="ghost"
          className="reset-appearance"
          onClick={() => setPrefs({ wide: false, relaxed: false, awake: false })}
        >
          <RotateCcw /> Reset settings
        </Button>
      </SheetContent>
    </Sheet>
  );
}
