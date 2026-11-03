import { useState } from "react";
import { Plus, Settings, CheckCircle2, ChevronRight } from "lucide-react";
import { AppearancePanel } from "@/components/appearance-panel";
import { SettingsSheet } from "@/components/settings-panel";
import { useInstallPrompt } from "@/lib/use-install";
import mark from "@/assets/scriptorium-mark.png";

const hoverable = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export function SideNav({ onNewDocument }: { onNewDocument: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const { installed, installNote, install } = useInstallPrompt();
  const open = expanded || pinned;

  return (
    <>
      <nav
        className="side-nav"
        data-expanded={open}
        aria-label="Workspace navigation"
        onMouseEnter={() => {
          if (hoverable()) setExpanded(true);
        }}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="side-nav-brand">
          <img src={mark} width={26} height={30} alt="Scriptorium" />
          <span className="side-nav-label brand-label">Scriptorium</span>
          <button
            type="button"
            className="side-nav-toggle"
            aria-label={pinned ? "Collapse menu" : "Keep menu open"}
            aria-pressed={pinned}
            onClick={() => setPinned((v) => !v)}
          >
            <ChevronRight />
          </button>
        </div>
        <div className="side-nav-items">
          <button type="button" className="side-nav-item" onClick={onNewDocument}>
            <Plus />
            <span className="side-nav-label">New document</span>
          </button>
          <AppearancePanel
            triggerClassName="side-nav-item"
            label="Themes"
            side="right"
            open={themesOpen}
            onOpenChange={setThemesOpen}
          />
          <button
            type="button"
            className="side-nav-item"
            data-active={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          >
            <Settings />
            <span className="side-nav-label">Settings</span>
          </button>
        </div>
        <div className="side-nav-footer">
          {installed ? (
            <div className="side-nav-item side-nav-installed" aria-live="polite">
              <CheckCircle2 />
              <span className="side-nav-label">App installed</span>
            </div>
          ) : (
            <button type="button" className="side-nav-item" onClick={install}>
              <img src={mark} alt="" className="install-mark" />
              <span className="side-nav-label">Install app</span>
            </button>
          )}
          {installNote && (
            <p className="side-nav-note" role="status">
              {installNote}
            </p>
          )}
        </div>
      </nav>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
