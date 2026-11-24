"use client";

import { useCallback, useEffect, useState } from "react";
import AlreadyInstalledConfirm from "@/components/AlreadyInstalledConfirm";
import InstallGuide from "@/components/InstallGuide";
import { OPEN_GUIDE_EVENT, markInstalledHere, useInstall, wasInstalledHere } from "@/lib/installState";
import { installHintFor } from "@/lib/pwa";

// Mounted once in each signed-in layout. Two jobs:
//  1. A small, dismissible card: "Add Cindy to your Home Screen" (Android: the browser's real
//     install dialog; iPhone: the on-screen steps). Hidden inside the installed app, on computers,
//     and for good once closed.
//  2. Listens for "open the install steps" (the account-menu item sends it), so the steps can be
//     reopened any time, even after the card was dismissed. The steps live HERE, not in the menu,
//     because the menu closes and would take them with it.
// Keeps its own English/Hebrew text and reads the language from <html dir> (like HelpWidget),
// because it sits under both language systems.
const STRINGS = {
  en: {
    title: "Add Cindy to your Home Screen",
    body: "Have Cindy open full screen, like an app.",
    go: "Let’s do it!",
    close: "Not now",
  },
  he: {
    title: "הוסיפו את Cindy למסך הבית",
    body: "שתיפתח Cindy במסך מלא, כמו אפליקציה.",
    go: "בואו נעשה את זה!",
    close: "לא עכשיו",
  },
};

const DISMISS_KEY = "installPromptDismissed";

export default function InstallPrompt() {
  const inst = useInstall();
  const [lang, setLang] = useState<"en" | "he">("en");
  const [dismissed, setDismissed] = useState(true); // hidden until we have read the saved choice
  const [guide, setGuide] = useState(false);
  const [confirm, setConfirm] = useState(false); // "you already added it — again?"

  useEffect(() => {
    setLang(document.documentElement.dir === "rtl" ? "he" : "en");
    let saved = false;
    try {
      saved = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* private mode: just show it */
    }
    // Testing/support: opening any page with ?install=1 shows the card again even after it was dismissed.
    if (new URLSearchParams(window.location.search).get("install") === "1") saved = false;
    setDismissed(saved);
  }, []);

  const { canPrompt, promptInstall } = inst;
  const start = useCallback(() => {
    if (canPrompt) void promptInstall();
    else setGuide(true);
  }, [canPrompt, promptInstall]);
  // Anyone who already went through the steps on this phone is asked before doing it again.
  const requestStart = useCallback(() => {
    if (wasInstalledHere()) setConfirm(true);
    else start();
  }, [start]);
  useEffect(() => {
    window.addEventListener(OPEN_GUIDE_EVENT, requestStart);
    return () => window.removeEventListener(OPEN_GUIDE_EVENT, requestStart);
  }, [requestStart]);

  const hint = !inst.ready
    ? "none"
    : installHintFor({ standalone: inst.standalone, dismissed, ios: inst.ios, android: inst.android, canPrompt: inst.canPrompt });
  const s = STRINGS[lang];

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <>
      {hint !== "none" && (
        <div dir={lang === "he" ? "rtl" : "ltr"} className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold">{s.title}</p>
              <p className="mt-0.5 text-sm text-blue-800">{s.body}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestStart}
            className="mt-3 w-full rounded-full bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {s.go}
          </button>
          <div className="mt-2 text-center">
            <button type="button" onClick={dismiss} className="text-xs text-blue-700 underline">
              {s.close}
            </button>
          </div>
        </div>
      )}
      {guide && (
        <InstallGuide
          lang={lang}
          onClose={(finished) => {
            setGuide(false);
            if (finished) {
              markInstalledHere();
              dismiss(); // they went all the way through: don't show the card again
            }
          }}
        />
      )}
      {confirm && (
        <AlreadyInstalledConfirm
          lang={lang}
          onNo={() => setConfirm(false)}
          onYes={() => {
            setConfirm(false);
            start();
          }}
        />
      )}
    </>
  );
}
