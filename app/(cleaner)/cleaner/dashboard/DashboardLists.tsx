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

// Greeting, then three zones in this order: Upcoming (its own scrolling box),
// a highlighted Today & tomorrow strip, and Past (its own scrolling box).
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
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredUpcoming = useMemo(() => upcoming.filter((b) => matchesSearch(b, query)), [upcoming, query]);
  const filteredPast = useMemo(() => past.filter((b) => matchesSearch(b, query)), [past, query]);
  const nextUp = filteredUpcoming.filter((b) => b.daysUntil <= 1);
  const later = filteredUpcoming.filter((b) => b.daysUntil > 1);
  const noResults = t("dash_no_search_results");

  return (
    <>
      <DashboardGreeting
        name={name}
        trailing={
          <button
            type="button"
            onClick={() => {
              if (searchOpen) setQuery("");
              setSearchOpen((o) => !o);
            }}
            aria-label={t("dash_search_placeholder")}
            aria-expanded={searchOpen}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              searchOpen ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {searchOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              )}
            </svg>
          </button>
        }
      />

      {searchOpen && (
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("dash_search_placeholder")}
          aria-label={t("dash_search_placeholder")}
          className="w-full mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-base text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      )}

      <ScheduleBox
        title={t("dash_upcoming")}
        count={later.length}
        empty={query ? noResults : t("dash_no_upcoming")}
      >
        {later.map((b) => (
          <UpcomingCleanRow key={b.id} booking={b} todayStr={todayStr} daysUntil={b.daysUntil} hourlyRate={hourlyRate} />
        ))}
      </ScheduleBox>

      <NextUpStrip title={t("dash_today_tomorrow")} count={nextUp.length}>
        {nextUp.map((b) => (
          <UpcomingCleanRow key={b.id} booking={b} todayStr={todayStr} daysUntil={b.daysUntil} hourlyRate={hourlyRate} inStrip />
        ))}
      </NextUpStrip>

      <ScheduleBox title={t("dash_past")} count={filteredPast.length} empty={query ? noResults : t("dash_no_past")}>
        {filteredPast.map((b) => (
          <PastCleanRow key={b.id} booking={b} todayStr={todayStr} hourlyRate={hourlyRate} />
        ))}
      </ScheduleBox>
    </>
  );
}
