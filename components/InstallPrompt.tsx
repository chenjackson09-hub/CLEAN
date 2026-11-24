"use client";

import { useEffect, useState } from "react";
import InstallGuide from "@/components/InstallGuide";
import { installHintFor, isAndroidDevice, isIosDevice, type InstallHint } from "@/lib/pwa";

// A small, dismissible card: "Add Cindy to your Home Screen". Android shows a real Install button
// (the browser tells us when it can); iPhone has no such button, so it gets the written steps.
// Hidden inside the installed app, on computers, and for good once closed.
// Keeps its own English/Hebrew text and reads the language from <html dir> (like HelpWidget),
// because it sits under both language systems.
const STRINGS = {
  en: {
    title: "Add Cindy to your Home Screen",
    ios: "Have Cindy open full screen, like an app.",
    android: "Have Cindy open full screen, like an app.",
    go: "Let’s do it!",
    close: "Not now",
  },
  he: {
    title: "הוסיפו את Cindy למסך הבית",
    ios: "שתיפתח Cindy במסך מלא, כמו אפליקציה.",
    android: "שתיפתח Cindy במסך מלא, כמו אפליקציה.",
    go: "בואו נעשה את זה!",
    close: "לא עכשיו",
  },
};

const DISMISS_KEY = "installPromptDismissed";

// The browser's own "install" event; not in TypeScript's built-in types.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function InstallPrompt() {
  const [hint, setHint] = useState<InstallHint>("none");
  const [lang, setLang] = useState<"en" | "he">("en");
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    setLang(document.documentElement.dir === "rtl" ? "he" : "en");

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* private mode: just show it */
    }
    // Testing/support: opening any page with ?install=1 shows the card again even after it was dismissed.
    if (new URLSearchParams(window.location.search).get("install") === "1") dismissed = false;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ua = navigator.userAgent;
    const base = {
      standalone,
      dismissed,
      ios: isIosDevice(ua, navigator.maxTouchPoints ?? 0),
      android: isAndroidDevice(ua),
    };
    setHint(installHintFor({ ...base, canPrompt: false }));

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the browser's own banner away; we show ours
      setDeferred(e as InstallEvent);
      setHint(installHintFor({ ...base, canPrompt: true }));
    };
    const onInstalled = () => setHint("none");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hint === "none") return null;
  const s = STRINGS[lang];

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setHint("none");
  };
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
    setHint("none");
  };

  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold">{s.title}</p>
          <p className="mt-0.5 text-sm text-blue-800">{hint === "ios" ? s.ios : s.android}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={hint === "ios" ? () => setGuide(true) : install}
        className="mt-3 w-full rounded-full bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {s.go}
      </button>
      <div className="mt-2 text-center">
        <button type="button" onClick={dismiss} className="text-xs text-blue-700 underline">
          {s.close}
        </button>
      </div>
      {guide && (
        <InstallGuide
          lang={lang}
          onClose={(finished) => {
            setGuide(false);
            if (finished) dismiss(); // they went all the way through: don't show the card again
          }}
        />
      )}
    </div>
  );
}
