"use client";

import { useState } from "react";
import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";
import type { BookingWithCustomer } from "@/types/database";
import DateBlock from "./DateBlock";
import { acknowledgeCancellation, acknowledgeAllCancellations } from "../../actions";

const MONTH_KEYS: TranslationKey[] = [
  "month_jan", "month_feb", "month_mar", "month_apr", "month_may", "month_jun",
  "month_jul", "month_aug", "month_sep", "month_oct", "month_nov", "month_dec",
];

// One cancelled booking, with the "I have seen this" dismiss button.
function UpdateCard({ booking }: { booking: BookingWithCustomer }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [, mm, dd] = booking.scheduled_date.split("-");
  const monthName = t(MONTH_KEYS[parseInt(mm) - 1]);

  async function dismiss() {
    setBusy(true);
    const res = await acknowledgeCancellation(booking.id);
    // On success the page revalidates and this card drops out of the list; only
    // re-enable on failure so a stuck row can be retried.
    if (res?.error) setBusy(false);
  }

  return (
    <div className="bg-white rounded-3xl shadow-md p-5 flex items-center gap-4">
      <DateBlock day={parseInt(dd)} month={monthName} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-lg text-gray-900 truncate">
          {t("dash_updates_cancelled")}
        </div>
        <div className="text-base text-gray-600 truncate">
          {booking.profiles?.full_name ?? t("req_customer")}
        </div>
        <div className="text-sm text-gray-500 mt-0.5">
          {booking.scheduled_start?.slice(0, 5)} · {booking.duration_hours}{t("req_h")}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        disabled={busy}
        className="shrink-0 rounded-full bg-gray-900 text-white text-sm font-semibold px-4 py-2 hover:bg-gray-700 transition disabled:opacity-50"
      >
        {busy ? t("dash_updates_dismissing") : t("dash_updates_seen")}
      </button>
    </div>
  );
}

// Collapsible "Updates" section listing bookings cancelled by someone other than
// this cleaner. Each stays until she taps "I have seen this". Hidden entirely
// when there's nothing to show.
export default function UpdatesSection({ bookings }: { bookings: BookingWithCustomer[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState(true);
  const [clearingAll, setClearingAll] = useState(false);

  if (bookings.length === 0) return null;

  async function dismissAll() {
    setClearingAll(true);
    // On success the page revalidates and the whole section drops out; only
    // re-enable on failure so it can be retried.
    const res = await acknowledgeAllCancellations(bookings.map((b) => b.id));
    if (res?.error) setClearingAll(false);
  }

  return (
    <section className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 bg-white rounded-3xl px-4 py-3 shadow-sm border border-amber-200"
      >
        <span className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="min-w-[22px] h-[22px] px-1.5 flex items-center justify-center text-xs font-bold text-white rounded-full bg-amber-500">
            {bookings.length}
          </span>
          {t("dash_updates")}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {bookings.length > 1 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={dismissAll}
                disabled={clearingAll}
                className="rounded-full bg-gray-900 text-white text-sm font-semibold px-4 py-2 hover:bg-gray-700 transition disabled:opacity-50"
              >
                {clearingAll ? t("dash_updates_dismissing") : t("dash_updates_seen_all")}
              </button>
            </div>
          )}
          {bookings.map((b) => (
            <UpdateCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </section>
  );
}
