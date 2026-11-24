"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { iosBrowserLayout, isIosInAppBrowser, type IosBrowserLayout } from "@/lib/pwa";

// "Add Cindy to your Home Screen" on an iPhone, shown over the real app.
//
// Why this is a checklist and not a step-by-step with Next buttons: Safari's own menu and share
// sheet are drawn by the phone ON TOP of the page. The page cannot see them or know which button
// was tapped, and any tap on the page while one is open just closes it. So there is nothing the
// page could sync to. Instead ALL the steps stay on screen at once, at the TOP — the part of the
// screen Safari's menus never cover — so a person can tap in Safari, glance up, and carry on.
// The bouncing arrow at the bottom points at Safari's first button.
// Own EN/HE text; language passed in (the caller reads <html dir>).
const STRINGS = {
  en: {
    title: "Add Cindy to your Home Screen",
    sub: "Keep this open and follow the steps in Safari.",
    steps: {
      dots: ["Tap the ⋯ button (bottom right, see the arrow)", "Tap “Share”", "Tap “View More” if you see it, then “Add to Home Screen” (a square with a +)", "Keep “Open as Web App” switched ON, then tap “Add” (top right)"],
      share: ["Tap the Share button (bottom middle, see the arrow)", "Scroll down and tap “Add to Home Screen” (a square with a +)", "Keep “Open as Web App” switched ON (if you see it), then tap “Add” (top right)"],
      chrome: ["Tap the Share button (next to the address, at the top)", "Scroll down and tap “Add to Home Screen” (a square with a +)", "Keep “Open as Web App” switched ON (if you see it), then tap “Add” (top right)"],
    },
    notSafari: "It looks like Cindy is open inside another app. Open this page in Safari first (copy the address into Safari).",
    added: "I added it",
    openShare: "Open Share for me",
    close: "Close",
  },
  he: {
    title: "הוסיפו את Cindy למסך הבית",
    sub: "השאירו את זה פתוח ועקבו אחרי השלבים ב-Safari.",
    steps: {
      dots: ["לחצו על הכפתור ⋯ (למטה בצד ימין, ראו את החץ)", "לחצו על ״שיתוף״", "לחצו על ״עוד״ (View More) אם רואים אותו, ואז על ״הוסף למסך הבית״ (ריבוע עם +)", "השאירו את ״Open as Web App״ מופעל ולחצו על ״הוסף״ (למעלה בפינה)"],
      share: ["לחצו על כפתור השיתוף (למטה באמצע, ראו את החץ)", "גללו מטה ולחצו על ״הוסף למסך הבית״ (ריבוע עם +)", "השאירו את ״Open as Web App״ מופעל (אם רואים אותו) ולחצו על ״הוסף״ (למעלה בפינה)"],
      chrome: ["לחצו על כפתור השיתוף (ליד הכתובת, למעלה)", "גללו מטה ולחצו על ״הוסף למסך הבית״ (ריבוע עם +)", "השאירו את ״Open as Web App״ מופעל (אם רואים אותו) ולחצו על ״הוסף״ (למעלה בפינה)"],
    },
    notSafari: "נראה ש-Cindy פתוחה בתוך אפליקציה אחרת. פתחו קודם את העמוד ב-Safari (העתיקו את הכתובת ל-Safari).",
    added: "הוספתי",
    openShare: "פתחו לי את השיתוף",
    close: "סגירה",
  },
};

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 00-1 1v7a1 1 0 001 1h14a1 1 0 001-1v-7a1 1 0 00-1-1h-1" />
  </svg>
);

// A bouncing arrow with a label, pointing DOWN at Safari's button just below it.
function PointDown({ label }: { label: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-white drop-shadow">
      <span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white px-2 text-xl font-bold leading-none text-blue-700 shadow-lg">{label}</span>
      <svg viewBox="0 0 24 24" className="h-8 w-8 animate-bounce" fill="currentColor" aria-hidden>
        <path d="M12 21l-8-9h5V3h6v9h5z" />
      </svg>
    </div>
  );
}

export default function InstallGuide({ lang, onClose }: { lang: "en" | "he"; onClose: (finished: boolean) => void }) {
  const s = STRINGS[lang];
  const [layout, setLayout] = useState<IosBrowserLayout>("dots");
  const [inApp, setInApp] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setLayout(iosBrowserLayout(navigator.userAgent));
    setInApp(isIosInAppBrowser(navigator.userAgent));
    setCanShare(typeof navigator.share === "function");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps = s.steps[layout];

  // EXPERIMENT: open the system share sheet straight from our own button (it is a real tap on the
  // page, so Safari allows it). That skips the "⋯ → Share" steps. Cancelling just rejects the promise.
  const openShare = async () => {
    try {
      await navigator.share({ title: "Cindy", url: window.location.origin });
    } catch {
      /* cancelled, or not allowed: the normal steps still work */
    }
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70] bg-black/35" dir={lang === "he" ? "rtl" : "ltr"}>
      {/* The checklist lives at the TOP: Safari's menu and share sheet open over the bottom part. */}
      <div className="pointer-events-auto absolute inset-x-3 top-3 mx-auto max-w-md" role="dialog" aria-label={s.title}>
        <div className="rounded-2xl bg-white p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight text-gray-900">{s.title}</h2>
              <p className="mt-0.5 text-xs text-gray-500">{s.sub}</p>
            </div>
            <button type="button" aria-label={s.close} onClick={() => onClose(false)} className="shrink-0 p-1 text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          {inApp && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">{s.notSafari}</p>}
          <ol className="mt-3 space-y-1.5">
            {steps.map((text, n) => (
              <li key={n} className="flex items-start gap-2.5 text-sm text-gray-800">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{n + 1}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex gap-2">
            {canShare && (
              <button type="button" onClick={openShare} className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                {s.openShare}
              </button>
            )}
            <button type="button" onClick={() => onClose(true)} className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              {s.added}
            </button>
          </div>
        </div>
      </div>

      {/* Arrow at Safari's first button. Safari's bar sits just below the page, so it rests at the bottom edge. */}
      {layout === "dots" && (
        <div className="absolute bottom-2 end-6">
          <PointDown label="⋯" />
        </div>
      )}
      {layout === "share" && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <PointDown label={<ShareIcon />} />
        </div>
      )}
    </div>,
    document.body,
  );
}
