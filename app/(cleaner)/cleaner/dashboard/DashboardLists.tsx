"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/context/LangContext";
import PastCleanCard from "./PastCleanCard";
import UpcomingCleanCard from "./UpcomingCleanCard";
import Tr from "./Tr";
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

export default function DashboardLists({
  upcoming,
  past,
  hourlyRate,
}: {
  upcoming: UpcomingBooking[];
  past: BookingWithCustomer[];
  hourlyRate: number | null;
}) {
  const { t } = useLang();
  const [query, setQuery] = useState("");

  const filteredUpcoming = useMemo(() => upcoming.filter((b) => matchesSearch(b, query)), [upcoming, query]);
  const filteredPast = useMemo(() => past.filter((b) => matchesSearch(b, query)), [past, query]);

  return (
    <>
      <div className="relative mb-6">
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
          className="w-full rounded-2xl border border-gray-200 bg-white ps-11 pe-4 py-3 text-base text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
          <Tr k="dash_upcoming" />
        </h2>

        {filteredUpcoming.length > 0 ? (
          <div className="space-y-4">
            {filteredUpcoming.map((b) => (
              <UpcomingCleanCard key={b.id} booking={b} daysUntil={b.daysUntil} hourlyRate={hourlyRate} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-base">
            {query ? t("dash_no_search_results") : <Tr k="dash_no_upcoming" />}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
          <Tr k="dash_past" />
        </h2>

        {filteredPast.length > 0 ? (
          <div className="space-y-4">
            {filteredPast.map((b) => (
              <PastCleanCard key={b.id} booking={b} hourlyRate={hourlyRate} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-base">
            {query ? t("dash_no_search_results") : <Tr k="dash_no_past" />}
          </div>
        )}
      </section>
    </>
  );
}
