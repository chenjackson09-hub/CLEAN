"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/context/LangContext";

// Shown once, right after a cleaner finishes registration — the congrats
// screen sends them here with ?welcome=1 instead of to the dashboard.
export default function WelcomeBubble({ name }: { name: string }) {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("welcome") === "1") setVisible(true);
  }, [searchParams]);

  function dismiss() {
    setVisible(false);
    // Strip the query param so refreshing (or coming back later) doesn't reshow it.
    router.replace(pathname);
  }

  if (!visible) return null;

  return (
    <div className="px-6 md:px-0 md:w-[45vw] md:mx-auto mb-2">
      <div className="relative bg-white border border-gray-200 rounded-2xl shadow-lg p-5">
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("avail_welcome_close")}
          className="absolute top-3 end-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="font-semibold text-gray-900 pe-6 mb-2">{t("avail_welcome_title", { name })}</p>
        <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{t("avail_welcome_body")}</p>
        {/* Tail pointing down toward the calendar below. */}
        <div className="absolute start-8 -bottom-2 w-4 h-4 bg-white border-b border-e border-gray-200 rotate-45" />
      </div>
    </div>
  );
}
