"use client";

import { useMemo, useState } from "react";
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

// Greeting, the search bar under the name, then three zones in this order: Upcoming (its own scrolling box),
// a highlighted Today & tomorrow strip, and Past (its own scrolling box, held to two rows).
// Today/tomorrow cleans live only in the strip so nothing shows twice.
export default function DashboardLists({
  name,
  todayStr,
  upcoming,
  past,
  hourlyRate,
}: {
  name: string;
  todayStr: string;
  upcoming: UpcomingBooking[];
  past: BookingWithCustomer[];
  hourlyRate: number | null;
}) {
  const { t } = useLang();
  const [query, setQuery] = useState("");

  const filteredUpcoming = useMemo(() => upcoming.filter((b) => matchesSearch(b, query)), [upcoming, query]);
  const filteredPast = useMemo(() => past.filter((b) => matchesSearch(b, query)), [past, query]);
  const nextUp = filteredUpcoming.filter((b) => b.daysUntil <= 1);
  const later = filteredUpcoming.filter((b) => b.daysUntil > 1);
  const noResults = t("dash_no_search_results");

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

      <ScheduleBox
        fill
        title={t("dash_upcoming")}
        count={later.length}
        empty={query ? noResults : t("dash_no_upcoming")}
      >
        {later.map((b) => (
          <UpcomingCleanRow key={b.id} booking={b} todayStr={todayStr} daysUntil={b.daysUntil} hourlyRate={hourlyRate} />
        ))}
      </ScheduleBox>

      {/* The strip and Past cleans sit together at the bottom of the screen. Past
          is secondary information, so it's held to two rows. */}
      <div className="mt-auto shrink-0">
        <NextUpStrip title={t("dash_today_tomorrow")} count={nextUp.length}>
          {nextUp.map((b) => (
            <UpcomingCleanRow key={b.id} booking={b} todayStr={todayStr} daysUntil={b.daysUntil} hourlyRate={hourlyRate} inStrip />
          ))}
        </NextUpStrip>

        <ScheduleBox maxH="max-h-[9.4rem]" title={t("dash_past")} count={filteredPast.length} empty={query ? noResults : t("dash_no_past")}>
          {filteredPast.map((b) => (
            <PastCleanRow key={b.id} booking={b} todayStr={todayStr} hourlyRate={hourlyRate} />
          ))}
        </ScheduleBox>
      </div>
    </>
  );
}
