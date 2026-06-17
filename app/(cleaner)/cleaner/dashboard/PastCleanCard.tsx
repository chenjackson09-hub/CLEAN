"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeBooking } from "../../actions";
import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";
import type { BookingWithCustomer } from "@/types/database";
import DateBlock from "./DateBlock";

const MONTH_KEYS: TranslationKey[] = [
  "month_jan", "month_feb", "month_mar", "month_apr", "month_may", "month_jun",
  "month_jul", "month_aug", "month_sep", "month_oct", "month_nov", "month_dec",
];

export default function PastCleanCard({ booking }: { booking: BookingWithCustomer }) {
  const { t } = useLang();
  const router = useRouter();
  const [status, setStatus] = useState(booking.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completed = status === "completed";
  const [, mm, dd] = booking.scheduled_date.split("-");
  const monthName = t(MONTH_KEYS[parseInt(mm) - 1]);

  async function complete() {
    setLoading(true);
    setError(null);
    const result = await completeBooking(booking.id);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setStatus("completed");
    setLoading(false);
    router.refresh();
  }
  const start = new Date(`1970-01-01T${booking.scheduled_start}`);
  const end = new Date(start.getTime() + booking.duration_hours * 60 * 60 * 1000);
  const formatted = end.toTimeString().slice(0, 5);

  return (
    <div
      className={`rounded-2xl shadow-md p-6 flex items-center gap-4 ${
        completed ? "bg-gray-100 opacity-60" : "bg-white"
      }`}
    >
      <DateBlock day={parseInt(dd)} month={monthName} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-xl text-gray-900">
          {booking.profiles?.full_name ?? t("req_customer")}
        </div>
        <div className="text-base text-gray-500 mt-1">{booking.address}</div>
        <div className="text-sm text-gray-500 mt-1">
          {booking.scheduled_start?.slice(0, 5)} - {formatted} · {booking.duration_hours}{t("req_h")}
        </div>
        {completed && (
          <span className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-gray-500">
            ✓ {t("dash_completed")}
          </span>
        )}
      </div>
      {!completed && (
        <div className="shrink-0 text-end">
          <button
            onClick={complete}
            disabled={loading}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t("dash_completing") : t("dash_complete")}
          </button>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}
