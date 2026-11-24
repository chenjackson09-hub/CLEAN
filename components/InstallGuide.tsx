"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isIosInAppBrowser } from "@/lib/pwa";

// A four-step, picture-by-picture walkthrough of "Add to Home Screen" on an iPhone. A website
// cannot press Safari's buttons for the person (Apple doesn't allow it), so this shows what each
// step looks like and which button is the one to tap (pulsing ring). Own EN/HE text; the pictures
// are drawn with plain boxes, not screenshots, so they never go out of date with a Safari update.
const STRINGS = {
  en: {
    step: (n: number, total: number) => `Step ${n} of ${total}`,
    steps: [
      { title: "Tap the ⋯ button", body: "It is at the bottom right of Safari. On some iPhones there is a Share button (a square with an arrow) in the middle of the bottom bar instead. Tap that one." },
      { title: "Tap Share", body: "In the little menu that opens, tap “Share”." },
      { title: "Tap “Add to Home Screen”", body: "Scroll the list down a little if you don’t see it yet." },
      { title: "Tap “Add”", body: "Check that the name says Cindy, then tap Add (top right). Cindy is now on your Home Screen. Open it from there, like any other app." },
    ],
    notSafari: "It looks like you opened Cindy inside another app. Open this page in Safari first (copy the address into Safari), then follow these steps.",
    back: "Back",
    next: "Next",
    done: "Done",
    close: "Close",
    share: "Share",
    orShare: "On some iPhones, tap this one instead:",
    addHome: "Add to Home Screen",
    copy: "Copy",
    bookmark: "Add Bookmark",
    find: "Find on Page",
    add: "Add",
    cancel: "Cancel",
  },
  he: {
    step: (n: number, total: number) => `שלב ${n} מתוך ${total}`,
    steps: [
      { title: "לחצו על הכפתור ⋯", body: "הוא נמצא בפינה הימנית התחתונה של Safari. באייפונים מסוימים יש במקומו כפתור שיתוף (ריבוע עם חץ) באמצע הסרגל התחתון. לחצו עליו." },
      { title: "לחצו על ״שיתוף״", body: "בתפריט הקטן שנפתח, לחצו על ״שיתוף״." },
      { title: "לחצו על ״הוסף למסך הבית״", body: "אם לא רואים אותה עדיין, גללו את הרשימה מעט למטה." },
      { title: "לחצו על ״הוסף״", body: "ודאו ששם האפליקציה הוא Cindy ולחצו על ״הוסף״ (למעלה בצד). Cindy נמצאת עכשיו במסך הבית. פתחו אותה משם, כמו כל אפליקציה אחרת." },
    ],
    notSafari: "נראה שפתחתם את Cindy בתוך אפליקציה אחרת. פתחו קודם את העמוד ב-Safari (העתיקו את הכתובת ל-Safari) ואז עקבו אחרי השלבים.",
    back: "הקודם",
    next: "הבא",
    done: "סיום",
    close: "סגירה",
    share: "שיתוף",
    orShare: "באייפונים מסוימים, לחצו על הכפתור הזה במקום:",
    addHome: "הוסף למסך הבית",
    copy: "העתקה",
    bookmark: "הוסף סימנייה",
    find: "חיפוש בעמוד",
    add: "הוסף",
    cancel: "ביטול",
  },
};

// The pulsing ring that says "this is the one".
function Ping() {
  return (
    <span className="pointer-events-none absolute inset-0">
      <span className="absolute inset-0 rounded-[inherit] ring-2 ring-blue-500" />
      <span className="absolute inset-0 animate-ping rounded-[inherit] ring-2 ring-blue-400" />
    </span>
  );
}

function Row({ label, hot, icon }: { label: string; hot?: boolean; icon?: ReactNode }) {
  return (
    <div className={`relative flex items-center justify-between rounded-lg px-3 py-2 text-sm ${hot ? "bg-blue-50 font-semibold text-gray-900" : "bg-white text-gray-500"}`}>
      <span>{label}</span>
      <span className="text-gray-400">{icon}</span>
      {hot && <Ping />}
    </div>
  );
}

const SquareArrow = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 00-1 1v7a1 1 0 001 1h14a1 1 0 001-1v-7a1 1 0 00-1-1h-1" />
  </svg>
);
const PlusSquare = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

// Picture of the Safari bottom bar: back · address · ⋯   (older iPhones: Share in the middle).
function Picture1({ orShare }: { orShare: string }) {
  return (
    <div dir="ltr" className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl bg-gray-200 p-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500">‹</div>
        <div className="flex h-9 flex-1 items-center justify-center rounded-full bg-white text-xs text-gray-500">clean-roan.vercel.app</div>
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-gray-800">
          ⋯<Ping />
        </div>
      </div>
      <p className="text-center text-xs text-gray-500">
        {orShare} <span className="inline-flex translate-y-1 text-gray-700"><SquareArrow /></span>
      </p>
    </div>
  );
}

export default function InstallGuide({ lang, onClose }: { lang: "en" | "he"; onClose: () => void }) {
  const s = STRINGS[lang];
  const [i, setI] = useState(0);
  const [inApp, setInApp] = useState(false);
  const total = s.steps.length;
  const last = i === total - 1;

  useEffect(() => {
    setInApp(isIosInAppBrowser(navigator.userAgent));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pictures = [
    <Picture1 key="1" orShare={s.orShare} />,
    <div key="2" dir="ltr" className="space-y-1 rounded-2xl bg-gray-200 p-2">
      <Row label={s.copy} />
      <Row label={s.share} hot icon={<SquareArrow />} />
      <Row label={s.find} />
    </div>,
    <div key="3" dir="ltr" className="space-y-1 rounded-2xl bg-gray-200 p-2">
      <Row label={s.bookmark} />
      <Row label={s.addHome} hot icon={<PlusSquare />} />
      <Row label={s.find} />
    </div>,
    <div key="4" dir="ltr" className="rounded-2xl bg-gray-200 p-3">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-blue-600">{s.cancel}</span>
        <span className="relative rounded-full bg-white px-3 py-1 font-semibold text-blue-600">
          {s.add}
          <Ping />
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
        <span className="text-base font-semibold text-gray-900">Cindy</span>
      </div>
    </div>,
  ];

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center" dir={lang === "he" ? "rtl" : "ltr"} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.steps[i].title}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">{s.step(i + 1, total)}</span>
          <button type="button" aria-label={s.close} onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <div className="mb-4 flex gap-1" aria-hidden>
          {s.steps.map((_, n) => (
            <span key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-blue-600" : "bg-gray-200"}`} />
          ))}
        </div>

        {i === 0 && inApp && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{s.notSafari}</p>}
        <div className="mb-4">{pictures[i]}</div>
        <h2 className="text-lg font-bold text-gray-900">{s.steps[i].title}</h2>
        <p className="mt-1 text-sm text-gray-600">{s.steps[i].body}</p>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setI((n) => n - 1)}
            className={`rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 ${i === 0 ? "invisible" : ""}`}
          >
            {s.back}
          </button>
          <button
            type="button"
            onClick={() => (last ? onClose() : setI((n) => n + 1))}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {last ? s.done : s.next}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
