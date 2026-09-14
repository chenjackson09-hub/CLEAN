"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/LangContext";

// Time-of-day greeting word, computed entirely client-side (never guessed on
// the server) so it reflects the viewer's own local clock — mirrors the admin
// dashboard's DashboardGreeting.tsx. The name itself is known server-side and
// renders immediately; only the greeting word waits for mount, defaulting to
// a non-breaking space so the layout doesn't jump once it resolves.
export default function DashboardGreeting({ name, pendingCount }: { name: string; pendingCount: number }) {
  const { t } = useLang();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const greetingWord = !now
    ? " "
    : now.getHours() < 12
      ? t("dash_good_morning")
      : now.getHours() < 18
        ? t("dash_good_afternoon")
        : t("dash_good_evening");

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="text-lg text-gray-400">{greetingWord}</p>
        <h1 className="text-3xl font-bold text-black mt-0.5">{name}</h1>
      </div>

      {/* Bell — links straight to the requests page; the red dot means at
          least one pending request hasn't been answered yet. */}
      <Link
        href="/cleaner/requests"
        aria-label={t("nav_requests")}
        className="relative shrink-0 mt-1 w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {pendingCount > 0 && (
          <span className="absolute top-2 end-2 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white" />
        )}
      </Link>
    </div>
  );
}
