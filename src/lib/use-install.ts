import { useEffect, useState } from "react";

type InstallEvent = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export function useInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [installNote, setInstallNote] = useState("");

  useEffect(() => {
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as unknown as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallEvent(null);
      return;
    }
    setInstallNote(
      ios
        ? 'Safari mein Share button dabao, phir "Add to Home Screen" chuno.'
        : 'Browser menu (⋮) kholo aur "Install app" ya "Add to Home screen" chuno.',
    );
  };

  return { installed, ios, installNote, install };
}
