import { useEffect, useState } from "react";
import { Check, SwatchBook, Type, LayoutGrid, Minus, Plus, RotateCcw, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { WorkspaceLoader } from "@/components/workspace-loader";
import { defaultAppearance, parseAppearance, themes, type Appearance } from "@/lib/appearance";

export function AppearancePanel() {
  const [value, setValue] = useState<Appearance>(defaultAppearance);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("themes");
  useEffect(() => {
    try {
      setValue(parseAppearance(localStorage.getItem("scriptorium-appearance-v2")));
    } catch {
      /* Storage is optional. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset["theme"] = value.theme;
    root.dataset["font"] = value.font;
    root.dataset["size"] = String(value.size);
    root.dataset["compact"] = String(value.compact);
    root.dataset["motion"] = String(value.motion);
    root.dataset["focus"] = String(value.focus);
    try {
      localStorage.setItem("scriptorium-appearance-v2", JSON.stringify(value));
    } catch {
      /* Storage is optional. */
    }
  }, [value, ready]);
  const update = (v: Partial<Appearance>) => setValue((s) => ({ ...s, ...v }));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="appearance-trigger"
          aria-label="Appearance"
          title="Appearance"
        >
          <SwatchBook strokeWidth={1.6} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="appearance-panel" collisionPadding={12}>
        <div className="panel-title">
          <div>
            <h2>Appearance</h2>
            <p>{themes.find((theme) => theme.id === value.theme)?.name} · {value.font === "sans" ? "Studio sans" : value.font === "serif" ? "Editorial serif" : "Technical mono"}</p>
          </div>
          <SwatchBook className="text-primary size-5" strokeWidth={1.6} />
        </div>
        <div className="appearance-tabs" role="tablist" aria-label="Appearance settings">
          {[
            { id: "themes", label: "Themes", icon: SwatchBook },
            { id: "fonts", label: "Fonts", icon: Type },
            { id: "layout", label: "Layout", icon: LayoutGrid },
          ].map((t) => (
            <Button
              role="tab"
              aria-selected={tab === t.id}
              variant="ghost"
              key={t.id}
              onClick={() => setTab(t.id)}
            >
              <t.icon />
              {t.label}
            </Button>
          ))}
        </div>
        {tab === "themes" && (
          <div className="theme-grid">
            {themes.map((t) => (
              <Button
                variant="tile"
                data-selected={value.theme === t.id}
                aria-pressed={value.theme === t.id}
                aria-label={`${t.name} theme`}
                onClick={() => update({ theme: t.id })}
                key={t.id}
                className="theme-tile"
              >
                <div data-theme={t.id} className="theme-preview" aria-hidden="true">
                  <div className="preview-colour"><span>Aa</span><Sun className="preview-light" /></div>
                  <div className="preview-paper">
                    <div className="preview-lines"><i /><i /></div>
                    <div className="preview-swatches"><i /><i /><i /></div>
                  </div>
                  {value.theme === t.id && (
                    <span className="theme-check">
                      <Check />
                    </span>
                  )}
                </div>
                <span className="theme-name">{t.name}{["ink", "forest", "graphite"].includes(t.id) ? <Moon /> : <Sun />}</span>
                <small>{t.subtitle}</small>
              </Button>
            ))}
          </div>
        )}
        {tab === "fonts" && (
          <div className="font-options">
            {[
              { id: "sans", name: "Manrope / DM Sans", label: "Studio sans" },
              { id: "serif", name: "Lora", label: "Editorial serif" },
              { id: "mono", name: "IBM Plex Mono", label: "Technical mono" },
            ].map((f) => (
              <Button
                variant="tile"
                key={f.id}
                data-selected={value.font === f.id}
                onClick={() => update({ font: f.id })}
                aria-pressed={value.font === f.id}
                className="font-option"
              >
                <span data-font={f.id} className="font-sample">
                  Aa
                </span>
                <span>
                  {f.label}
                  <small>{f.name}</small>
                </span>
                {value.font === f.id && <Check className="ml-auto text-primary" />}
              </Button>
            ))}
            <div className="preference-row">
              <span>Text size</span>
              <div className="flex items-center gap-3">
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label="Decrease text size"
                  disabled={value.size === 14}
                  onClick={() => update({ size: value.size - 1 })}
                >
                  <Minus />
                </Button>
                <span>{value.size}px</span>
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label="Increase text size"
                  disabled={value.size === 18}
                  onClick={() => update({ size: value.size + 1 })}
                >
                  <Plus />
                </Button>
              </div>
            </div>
          </div>
        )}
        {tab === "layout" && (
          <div className="layout-options">
            {[
              {
                key: "compact",
                label: "Compact spacing",
                detail: "A little more room for your ideas",
              },
              {
                key: "motion",
                label: "Gentle animations",
                detail: "Smooth transitions, less distraction",
              },
              { key: "focus", label: "Focus mode", detail: "Keep only the writing space" },
            ].map((p) => (
              <label className="preference-row" key={p.key}>
                <span>
                  <span className="preference-label">{p.label}{p.key === "motion" && <WorkspaceLoader className="loader-compact" />}</span>
                  <small>{p.detail}</small>
                </span>
                <Switch
                  aria-label={p.label}
                  checked={value[p.key as "compact" | "motion" | "focus"]}
                  onCheckedChange={(v) => update({ [p.key]: v })}
                />
              </label>
            ))}
          </div>
        )}
        <Button
          variant="ghost"
          className="reset-appearance"
          onClick={() => setValue({ ...defaultAppearance })}
        >
          <RotateCcw />
          Reset to Studio
        </Button>
      </PopoverContent>
    </Popover>
  );
}
