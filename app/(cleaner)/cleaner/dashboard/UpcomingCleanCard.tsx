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

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function UpcomingCleanCard({ booking }: { booking: BookingWithCustomer }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [, mm, dd] = booking.scheduled_date.split("-");
  const monthName = t(MONTH_KEYS[parseInt(mm) - 1]);
  const days = daysUntil(booking.scheduled_date);
  const countdown = days <= 0 ? t("req_today") : days === 1 ? t("req_in_one_day") : t("req_in_days", { n: days });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-start bg-white rounded-2xl shadow-md p-6 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer"
      >
        <DateBlock day={parseInt(dd)} month={monthName} />
        <div className="min-w-0">
          <div className="font-semibold text-xl text-gray-900">
            {booking.profiles?.full_name ?? t("req_customer")}
          </div>
          <div className="text-base text-gray-500 mt-1">{booking.address}</div>
          <div className="text-sm text-gray-500 mt-1">
            {booking.scheduled_start?.slice(0, 5)} · {countdown}
          </div>
        </div>
      </button>

      {open && <CleanDetailModal booking={booking} onClose={() => setOpen(false)} />}
    </>
  );
}
