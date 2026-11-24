"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isIosInAppBrowser } from "@/lib/pwa";

// Pop-up messages that walk a person through "Add to Home Screen" on an iPhone, laid over the real
// app. The page cannot press Safari's buttons, or see which one was pressed, so each pop-up says
// what to tap and the person moves on with "Next". Step 1 sits at the bottom of the screen with
// bouncing arrows that point at where Safari's own buttons are; steps 2–4 sit at the TOP, because
// Safari's menu and share sheet open over the bottom half of the screen.
// Own EN/HE text, language passed in (the caller reads <html dir>).
const STRINGS = {
  en: {
    step: (n: number, total: number) => `Step ${n} of ${total}`,
    steps: [
      { title: "Tap the ⋯ button", body: "It is right down here, at the bottom right of your screen." },
      { title: "Tap “Share”", body: "A menu just opened at the bottom of your screen. Tap “Share” in it." },
      { title: "Tap “Add to Home Screen”", body: "Scroll the list at the bottom of your screen down a little if you don’t see it yet." },
      { title: "Tap “Add”", body: "Check that the name says Cindy, then tap “Add” at the top right of your screen. That’s it! Cindy is now on your Home Screen. Open it from there." },
    ],
    olderPhone: "On some iPhones there is a Share button here instead. Tap that one.",
    notSafari: "It looks like you opened Cindy inside another app. Open this page in Safari first (copy the address into Safari), then do these steps.",
    back: "Back",
    next: "Next",
    done: "Done",
    close: "Close",
    share: "Share",
    addHome: "Add to Home Screen",
    add: "Add",
  },
  he: {
    step: (n: number, total: number) => `שלב ${n} מתוך ${total}`,
    steps: [
      { title: "לחצו על הכפתור ⋯", body: "הוא ממש כאן למטה, בפינה הימנית התחתונה של המסך." },
      { title: "לחצו על ״שיתוף״", body: "נפתח עכשיו תפריט בתחתית המסך. לחצו בו על ״שיתוף״." },
      { title: "לחצו על ״הוסף למסך הבית״", body: "אם אתם לא רואים אותה עדיין, גללו מעט למטה את הרשימה שבתחתית המסך." },
      { title: "לחצו על ״הוסף״", body: "ודאו ששם האפליקציה הוא Cindy ולחצו על ״הוסף״ בפינה העליונה של המסך. זהו! Cindy נמצאת עכשיו במסך הבית. פתחו אותה משם." },
    ],
    olderPhone: "באייפונים מסוימים יש כאן במקום זה כפתור שיתוף. לחצו עליו.",
    notSafari: "נראה שפתחתם את Cindy בתוך אפליקציה אחרת. פתחו קודם את העמוד ב-Safari (העתיקו את הכתובת ל-Safari) ואז בצעו את השלבים.",
    back: "הקודם",
    next: "הבא",
    done: "סיום",
    close: "סגירה",
    share: "שיתוף",
    addHome: "הוסף למסך הבית",
    add: "הוסף",
  },
};

const SquareArrow = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 00-1 1v7a1 1 0 001 1h14a1 1 0 001-1v-7a1 1 0 00-1-1h-1" />
  </svg>
);
const PlusSquare = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

// A bouncing arrow with a label, pointing DOWN at a Safari button below it.
function PointDown({ label }: { label: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 text-white drop-shadow">
      <span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white px-2 text-xl font-bold leading-none text-blue-700 shadow-lg">{label}</span>
      <svg viewBox="0 0 24 24" className="h-8 w-8 animate-bounce" fill="currentColor" aria-hidden>
        <path d="M12 21l-8-9h5V3h6v9h5z" />
      </svg>
    </div>
  );
}

// Small look-alike of the thing to tap, so people recognise it when they see it.
function Hint({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div dir="ltr" className="relative mt-3 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-gray-900 ring-2 ring-blue-500">
      <span>{label}</span>
      <span className="text-gray-500">{icon}</span>
    </div>
  );
}

export default function InstallGuide({ lang, onClose }: { lang: "en" | "he"; onClose: (finished: boolean) => void }) {
  const s = STRINGS[lang];
  const [i, setI] = useState(0);
  const [inApp, setInApp] = useState(false);
  const total = s.steps.length;
  const last = i === total - 1;
  const atBottom = i === 0;

  useEffect(() => {
    setInApp(isIosInAppBrowser(navigator.userAgent));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hint =
    i === 1 ? <Hint label={s.share} icon={<SquareArrow />} /> : i === 2 ? <Hint label={s.addHome} icon={<PlusSquare />} /> : i === 3 ? <Hint label={s.add} icon={null} /> : null;

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/50" dir={lang === "he" ? "rtl" : "ltr"}>
      {/* Steps 2–4: the pop-up stays at the top, out of the way of Safari's menu and share sheet. */}
      {/* Step 1: it sits just above the bottom bar, with arrows pointing at Safari's buttons. */}
      <div
        className={`absolute inset-x-4 mx-auto max-w-md ${atBottom ? "bottom-[calc(10.5rem+env(safe-area-inset-bottom))]" : "top-4"}`}
        role="dialog"
        aria-modal="true"
        aria-label={s.steps[i].title}
      >
        <div className="rounded-3xl bg-white p-5 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">{s.step(i + 1, total)}</span>
            <button type="button" aria-label={s.close} onClick={() => onClose(false)} className="p-1 text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          <div className="mb-3 flex gap-1" aria-hidden>
            {s.steps.map((_, n) => (
              <span key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-blue-600" : "bg-gray-200"}`} />
            ))}
          </div>

          {i === 0 && inApp && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{s.notSafari}</p>}
          <h2 className="text-lg font-bold text-gray-900">{s.steps[i].title}</h2>
          <p className="mt-1 text-sm text-gray-600">{s.steps[i].body}</p>
          {i === 0 && <p className="mt-2 text-sm text-gray-500">{s.olderPhone}</p>}
          {hint}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setI((n) => n - 1)}
              className={`rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 ${i === 0 ? "invisible" : ""}`}
            >
              {s.back}
            </button>
            <button
              type="button"
              onClick={() => (last ? onClose(true) : setI((n) => n + 1))}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {last ? s.done : s.next}
            </button>
          </div>
        </div>
        {/* pointing from the pop-up down at the menu that opens at the bottom of the screen */}
        {!atBottom && !last && (
          <div className="mt-2 flex justify-center text-white drop-shadow">
            <svg viewBox="0 0 24 24" className="h-8 w-8 animate-bounce" fill="currentColor" aria-hidden>
              <path d="M12 21l-8-9h5V3h6v9h5z" />
            </svg>
          </div>
        )}
      </div>

      {/* Step 1 arrows: ⋯ at the bottom right (where Safari puts it), Share at the bottom middle (older iPhones). */}
      {atBottom && (
        <>
          <div className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2">
            <PointDown label={<SquareArrow className="h-5 w-5" />} />
          </div>
          <div className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-6">
            <PointDown label="⋯" />
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
