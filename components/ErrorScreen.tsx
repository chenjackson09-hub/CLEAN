"use client";

import { useEffect, useState } from "react";

// The screen people see when an address doesn't exist or a page fails to load. It keeps its own
// English/Hebrew text and reads the language from <html dir> (like HelpWidget), so it works
// under either language system — and even when the part of the app that normally provides the
// language is the thing that failed.
const STRINGS = {
  en: {
    notFoundTitle: "We couldn't find that page",
    notFoundBody: "The address may be wrong, or the page may have moved.",
    errorTitle: "Something went wrong",
    errorBody: "This page didn't load. It's not something you did. Please try again.",
    retry: "Try again",
    home: "Back to Clean",
  },
  he: {
    notFoundTitle: "לא מצאנו את העמוד הזה",
    notFoundBody: "ייתכן שהכתובת שגויה או שהעמוד הועבר.",
    errorTitle: "משהו השתבש",
    errorBody: "העמוד לא נטען. זה לא קשור למשהו שעשיתם. אפשר לנסות שוב.",
    retry: "לנסות שוב",
    home: "חזרה ל-Clean",
  },
};

export default function ErrorScreen({ kind, onRetry }: { kind: "not-found" | "error"; onRetry?: () => void }) {
  const [lang, setLang] = useState<"en" | "he">("en");
  useEffect(() => {
    setLang(document.documentElement.dir === "rtl" ? "he" : "en");
  }, []);
  const s = STRINGS[lang];
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow p-8 text-center">
        <p className="text-lg font-bold text-blue-600 mb-4">Clean</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{kind === "not-found" ? s.notFoundTitle : s.errorTitle}</h1>
        <p className="text-sm text-gray-600 mb-6">{kind === "not-found" ? s.notFoundBody : s.errorBody}</p>
        <div className="flex flex-col gap-2">
          {kind === "error" && onRetry && (
            <button type="button" onClick={onRetry} className="w-full bg-blue-600 text-white rounded-full py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">
              {s.retry}
            </button>
          )}
          {/* A full page load on purpose: "/" sends each person to their own home screen. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className={
              kind === "error" && onRetry
                ? "w-full border border-gray-300 rounded-full py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                : "w-full bg-blue-600 text-white rounded-full py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
            }
          >
            {s.home}
          </a>
        </div>
      </div>
    </div>
  );
}
