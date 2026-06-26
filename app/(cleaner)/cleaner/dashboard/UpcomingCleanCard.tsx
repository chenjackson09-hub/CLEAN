"use client";

import { useState } from "react";
import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";
import type { BookingWithCustomer } from "@/types/database";
import DateBlock from "./DateBlock";
import CleanDetailModal from "./CleanDetailModal";

const MONTH_KEYS: TranslationKey[] = [
  "month_jan", "month_feb", "month_mar", "month_apr", "month_may", "month_jun",
  "month_jul", "month_aug", "month_sep", "month_oct", "month_nov", "month_dec",
];

export default function UpcomingCleanCard({
  booking,
  daysUntil,
}: {
  booking: BookingWithCustomer;
  daysUntil: number;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [yyyy, mm, dd] = booking.scheduled_date.split("-");
  const monthName = t(MONTH_KEYS[parseInt(mm) - 1]);

  // "Today" / "Tomorrow" / "In N days" until the clean.
  const whenLabel =
    daysUntil <= 0
      ? t("dash_when_today")
      : daysUntil === 1
        ? t("dash_when_tomorrow")
        : `${t("dash_when_in")} ${daysUntil} ${t("dash_when_days")}`;

  // Whole-day countdown to the clean (compared by calendar day, ignoring time).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  const daysUntil = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const countdown =
    daysUntil <= 0
      ? t("dash_in_today")
      : daysUntil === 1
        ? t("dash_in_tomorrow")
        : t("dash_in_days").replace("{n}", String(daysUntil));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-start bg-white rounded-3xl shadow-md p-6 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
      >
        <DateBlock day={parseInt(dd)} month={monthName} />
        <div className="min-w-0">
          <div className="font-semibold text-xl text-gray-900">
            {booking.profiles?.full_name ?? t("req_customer")}
          </div>
          <div className="text-base text-gray-500 mt-1">{booking.address}</div>
          <div className="text-sm text-gray-500 mt-1">
            {booking.address} · {booking.scheduled_start?.slice(0, 5)} · {whenLabel}
          </div>
        </div>
        <span className="ms-auto self-start shrink-0 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1">
          {countdown}
        </span>
      </button>

      {open && <CleanDetailModal booking={booking} onClose={() => setOpen(false)} />}
    </>
  );
}
