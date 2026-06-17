"use client";

import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";
import type { BookingWithCustomer } from "@/types/database";
import DateBlock from "./DateBlock";

const MONTH_KEYS: TranslationKey[] = [
  "month_jan", "month_feb", "month_mar", "month_apr", "month_may", "month_jun",
  "month_jul", "month_aug", "month_sep", "month_oct", "month_nov", "month_dec",
];

export default function UpcomingCleanCard({ booking }: { booking: BookingWithCustomer }) {
  const { t } = useLang();
  const [, mm, dd] = booking.scheduled_date.split("-");
  const monthName = t(MONTH_KEYS[parseInt(mm) - 1]);
  const start = new Date(`1970-01-01T${booking.scheduled_start}`);
  const end = new Date(start.getTime() + booking.duration_hours * 60 * 60 * 1000);
  const formatted = end.toTimeString().slice(0, 5);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4">
      <DateBlock day={parseInt(dd)} month={monthName} />
      <div className="min-w-0">
        <div className="font-semibold text-xl text-gray-900">
          {booking.profiles?.full_name ?? t("req_customer")}
        </div>
        <div className="text-base text-gray-500 mt-1">{booking.address}</div>
        <div className="text-sm text-gray-500 mt-1">
          {booking.scheduled_start?.slice(0, 5)} - {formatted} · {booking.duration_hours}{t("req_h")}
        </div>
      </div>
    </div>
  );
}
