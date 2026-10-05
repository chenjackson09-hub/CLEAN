"use client";

import type { ReactNode } from "react";
import { isSameWeek, weekdayOf } from "@/lib/dateMath";
import { MONTHS_SHORT, WEEKDAYS_SHORT } from "@/lib/dateLabels";

// Shared building blocks for the host and cleaner home screens: a compact date
// chip, a row, a scrolling box and a "today & tomorrow" strip. i18n-agnostic
// (the two sides use different translation systems) — callers pass strings and
// a plain `lang`.

export type ChipLang = "en" | "he";

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
  tone?: "default" | "active" | "accent" | "amber";
}) {
  const [, m, d] = dateStr.split("-").map(Number);
  const label = isSameWeek(dateStr, todayStr) ? WEEKDAYS_SHORT[lang][weekdayOf(dateStr)] : MONTHS_SHORT[lang][m - 1];
  // "active" = a clean that is still ahead of us: a darker grey than the faded
  // light-grey chip used for past cleans.
  const toneClass =
    tone === "accent"
      ? "bg-blue-600 text-white"
      : tone === "amber"
        ? "bg-amber-100 text-amber-900"
        : tone === "active"
          ? "bg-gray-300 text-gray-900"
          : "bg-gray-100 text-gray-900";
  const labelClass =
    tone === "accent" ? "text-white/80" : tone === "amber" ? "text-amber-700" : tone === "active" ? "text-gray-600" : "text-gray-500";
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
  chipTone?: "default" | "active" | "accent" | "amber";
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
// section off screen. By default it's capped (`maxH`, ~20% of the screen) and
// shrinks to its content when short. With `fill` it's the flexible one: it takes
// whatever height the page has left (the page is a fixed-height column) down to
// the bottom of the screen, never grows past its content, and scrolls inside.
export function ScheduleBox({
  title,
  count,
  empty,
  fill = false,
  maxH = "max-h-[20vh]",
  children,
}: {
  title: string;
  count: number;
  empty: string;
  fill?: boolean;
  maxH?: string;
  children: ReactNode;
}) {
  return (
    <section className={`mb-4 ${fill ? "flex flex-col min-h-0" : "shrink-0"}`}>
      <h2 className="shrink-0 flex items-center gap-2 px-1 mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {title}
        {count > 0 && <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 normal-case">{count}</span>}
      </h2>
      {count > 0 ? (
        <div className={`${fill ? "min-h-0" : maxH} overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-sm divide-y divide-gray-100`}>
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
    <section className="mb-4 shrink-0">
      <h2 className="px-1 mb-1.5 text-xs font-semibold text-blue-700 uppercase tracking-wide">{title}</h2>
      <div className="rounded-2xl border border-blue-200 bg-blue-50 divide-y divide-blue-100">{children}</div>
    </section>
  );
}
