"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/LangContext";
import { NextUpStrip, ScheduleBox } from "@/components/home/ScheduleParts";
import { PastCleanRow, UpcomingCleanRow } from "./CleanRows";
import DashboardGreeting from "./DashboardGreeting";
import type { BookingWithCustomer } from "@/types/database";

type UpcomingBooking = BookingWithCustomer & { daysUntil: number };

// Client-side only, no server round-trip — matches admin's SearchInput
// pattern (app/admin/SearchInput.tsx), just against the customer's name or
// address instead of an admin list's rows.
function matchesSearch(booking: BookingWithCustomer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = booking.profiles?.full_name?.toLowerCase() ?? "";
  const address = booking.address?.toLowerCase() ?? "";
  return name.includes(q) || address.includes(q);
}

// Greeting, the search bar under the name, then everything in order of what needs attention: requests
// waiting for an answer, finished cleans to mark complete, today & tomorrow (highlighted), upcoming cleans,
// and past cleans (collapsed). The page just grows with its content, so nothing is pushed to the bottom.
// Today/tomorrow cleans live only in the strip so nothing shows twice.
export default function DashboardLists({
  name,
  todayStr,
  upcoming,
  past,
  hourlyRate,
  waitingRequests = 0,
}: {
  name: string;
  todayStr: string;
  upcoming: UpcomingBooking[];
  past: BookingWithCustomer[];
  hourlyRate: number | null;
  // Requests this cleaner has not answered yet (they are answered on the Requests tab).
  waitingRequests?: number;
}) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [showPast, setShowPast] = useState(false);

  const filteredUpcoming = useMemo(() => upcoming.filter((b) => matchesSearch(b, query)), [upcoming, query]);
  const filteredPast = useMemo(() => past.filter((b) => matchesSearch(b, query)), [past, query]);
  const nextUp = filteredUpcoming.filter((b) => b.daysUntil <= 1);
  const later = filteredUpcoming.filter((b) => b.daysUntil > 1);
  const noResults = t("dash_no_search_results");
  // A clean that has happened but is not marked complete yet is something to DO, so it never hides in the
  // collapsed past list; completed and cancelled ones are history.
  const toComplete = filteredPast.filter((b) => b.status === "accepted");
  const history = filteredPast.filter((b) => b.status !== "accepted");
  // Searching opens the history so a match is never hidden behind a closed section.
  const historyOpen = showPast || query.trim() !== "";

  return (
    <>
      <DashboardGreeting name={name} />

      <div className="relative mb-5 shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-3.5 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("dash_search_placeholder")}
          aria-label={t("dash_search_placeholder")}
          className="w-full rounded-2xl border border-gray-200 bg-white ps-11 pe-4 py-2.5 text-base text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {waitingRequests > 0 && !query && (
        <Link
          href="/cleaner/requests"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
        >
          <span>{waitingRequests === 1 ? t("dash_waiting_one") : t("dash_waiting_many", { n: waitingRequests })}</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      {toComplete.length > 0 && (
        <ScheduleBox maxH="max-h-[40vh]" title={t("dash_to_complete")} count={toComplete.length} empty="">
          {toComplete.map((b) => (
            <PastCleanRow key={b.id} booking={b} todayStr={todayStr} hourlyRate={hourlyRate} />
          ))}
        </ScheduleBox>
      )}

      <NextUpStrip title={t("dash_today_tomorrow")} count={nextUp.length}>
        {nextUp.map((b) => (
          <UpcomingCleanRow key={b.id} booking={b} todayStr={todayStr} daysUntil={b.daysUntil} hourlyRate={hourlyRate} inStrip />
        ))}
      </NextUpStrip>

      <ScheduleBox
        maxH="max-h-[50vh]"
        title={t("dash_upcoming")}
        count={later.length}
        empty={query ? noResults : t("dash_no_upcoming")}
        emptyAction={
          !query && (
            <Link href="/cleaner/availability" className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              {t("dash_find_days")}
            </Link>
          )
        }
      >
        {later.map((b) => (
          <UpcomingCleanRow key={b.id} booking={b} todayStr={todayStr} daysUntil={b.daysUntil} hourlyRate={hourlyRate} />
        ))}
      </ScheduleBox>

      {/* History is secondary: one quiet line until it is opened (or searched). */}
      {history.length > 0 ? (
        <section>
          <button
            type="button"
            onClick={() => setShowPast((o) => !o)}
            aria-expanded={historyOpen}
            className="flex items-center gap-1 px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {t("dash_past_count", { n: history.length })}
            <span aria-hidden>{historyOpen ? "▴" : "▾"}</span>
          </button>
          {historyOpen && (
            <div className="mt-1.5 max-h-[40vh] overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-sm divide-y divide-gray-100">
              {history.map((b) => (
                <PastCleanRow key={b.id} booking={b} todayStr={todayStr} hourlyRate={hourlyRate} />
              ))}
            </div>
          )}
        </section>
      ) : toComplete.length === 0 ? (
        <p className="px-1 text-xs text-gray-400">{query ? noResults : t("dash_past_count", { n: 0 })}</p>
      ) : null}
    </>
  );
}
