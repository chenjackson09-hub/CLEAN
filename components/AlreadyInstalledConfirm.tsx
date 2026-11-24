"use client";

import { createPortal } from "react-dom";

// "You already added Cindy to your Home Screen — add it again?" Shown before the install steps
// start when this phone has already been through them. The page can't SEE the Home Screen, so
// the note says what to do if the icon was deleted. Own EN/HE text (language passed in).
const STRINGS = {
  en: {
    title: "You have already downloaded this app on your home screen",
    body: "Are you sure you want to download it again?",
    note: "If you deleted the icon, choose Yes.",
    yes: "Yes, download it again",
    no: "No, cancel",
  },
  he: {
    title: "כבר הורדתם את האפליקציה למסך הבית",
    body: "בטוחים שתרצו להוריד אותה שוב?",
    note: "אם מחקתם את האייקון, בחרו כן.",
    yes: "כן, להוריד שוב",
    no: "לא, ביטול",
  },
};

export default function AlreadyInstalledConfirm({ lang, onYes, onNo }: { lang: "en" | "he"; onYes: () => void; onNo: () => void }) {
  const s = STRINGS[lang];
  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 px-6" dir={lang === "he" ? "rtl" : "ltr"} onClick={onNo}>
      <div role="alertdialog" aria-modal="true" aria-label={s.title} className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="mx-auto mb-3 h-12 w-12 rounded-xl" />
        <h2 className="text-lg font-bold text-gray-900">{s.title}</h2>
        <p className="mt-2 text-base text-gray-700">{s.body}</p>
        <p className="mt-1 text-xs text-gray-500">{s.note}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onNo} className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            {s.no}
          </button>
          <button type="button" onClick={onYes} className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {s.yes}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
