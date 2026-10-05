"use client";

import type { ReactNode } from "react";
import { isSameWeek, weekdayOf } from "@/lib/dateMath";

// Shared building blocks for the host and cleaner home screens: a compact date
// chip, a row, a scrolling box and a "today & tomorrow" strip. i18n-agnostic
// (the two sides use different translation systems) — callers pass strings and
// a plain `lang`.

export type ChipLang = "en" | "he";

const WEEKDAYS: Record<ChipLang, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  he: ["יום א׳", "יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת"],
};
const MONTHS: Record<ChipLang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  he: ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"],
};

// Day number big, with a tiny label above it: the weekday when the date is in
// the same week as today ("Wed 8"), otherwise the month ("16 Sep"). Pure string
// math + fixed word lists, so server and client always render the same text.
export function DateChip({
  dateStr,
  todayStr,
  lang,
  tone = "default",
}: {
  dateStr: string;
  todayStr: string;
  lang: ChipLang;
  tone?: "default" | "accent" | "amber";
}) {
  const [, m, d] = dateStr.split("-").map(Number);
  const label = isSameWeek(dateStr, todayStr) ? WEEKDAYS[lang][weekdayOf(dateStr)] : MONTHS[lang][m - 1];
  const toneClass =
    tone === "accent" ? "bg-blue-600 text-white" : tone === "amber" ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-900";
  const labelClass = tone === "accent" ? "text-white/80" : tone === "amber" ? "text-amber-700" : "text-gray-500";
  return (
    <div className={`w-12 shrink-0 rounded-xl py-1.5 text-center leading-none ${toneClass}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${labelClass}`}>{label}</div>
      <div className="text-lg font-bold mt-1 tabular-nums">{d}</div>
    </div>
  );
}

// One compact line: chip · title / subtitle · trailing. Roughly 60px tall, so a
// box shows several at once.
export function ScheduleRow({
  dateStr,
  todayStr,
  lang,
  title,
  subtitle,
  trailing,
  chipTone,
  faded,
  onClick,
}: {
  dateStr: string;
  todayStr: string;
  lang: ChipLang;
  title: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  chipTone?: "default" | "accent" | "amber";
  faded?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 ${faded ? "opacity-60 hover:opacity-100 transition-opacity" : ""}`}>
      <button type="button" onClick={onClick} className="flex flex-1 min-w-0 items-center gap-3 text-start">
        <DateChip dateStr={dateStr} todayStr={todayStr} lang={lang} tone={chipTone} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-gray-900 truncate">{title}</span>
          {subtitle && <span className="block text-sm text-gray-500 truncate">{subtitle}</span>}
        </span>
      </button>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

// A titled box that scrolls inside itself, so a long list never pushes the next
// section off screen. Only grows to its content when there's little to show.
export function ScheduleBox({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-4">
      <h2 className="flex items-center gap-2 px-1 mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {title}
        {count > 0 && <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 normal-case">{count}</span>}
      </h2>
      {count > 0 ? (
        <div className="max-h-[26vh] overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-sm divide-y divide-gray-100">
          {children}
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm py-4 text-center text-sm text-gray-400">{empty}</div>
      )}
    </section>
  );
}

// The "now" band between Upcoming and Past: whatever is today or tomorrow,
// highlighted. Renders nothing when there's nothing to show.
export function NextUpStrip({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="mb-4">
      <h2 className="px-1 mb-1.5 text-xs font-semibold text-blue-700 uppercase tracking-wide">{title}</h2>
      <div className="rounded-2xl border border-blue-200 bg-blue-50 divide-y divide-blue-100">{children}</div>
    </section>
  );
}
