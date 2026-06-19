"use client";

import { createPortal } from "react-dom";
import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";
import type { BookingWithCustomer } from "@/types/database";

const MONTH_KEYS: TranslationKey[] = [
  "month_jan", "month_feb", "month_mar", "month_apr", "month_may", "month_jun",
  "month_jul", "month_aug", "month_sep", "month_oct", "month_nov", "month_dec",
];

export default function CleanDetailModal({
  booking,
  onClose,
}: {
  booking: BookingWithCustomer;
  onClose: () => void;
}) {
  const { t } = useLang();

  const [, mm, dd] = booking.scheduled_date.split("-");
  const monthName = t(MONTH_KEYS[parseInt(mm) - 1]);
  const start = new Date(`1970-01-01T${booking.scheduled_start}`);
  const end = new Date(start.getTime() + booking.duration_hours * 60 * 60 * 1000);
  const endFormatted = end.toTimeString().slice(0, 5);

  // Render at document.body via a portal so an ancestor's CSS transform (e.g.
  // the card's hover `-translate-y`) can't become the containing block for this
  // `fixed` overlay and trap it inside the card.
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-8 pb-5 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">
            {booking.profiles?.full_name ?? t("req_customer")}
          </h2>
          <button
            onClick={onClose}
            className="text-3xl text-gray-400 hover:text-gray-700 font-bold leading-none ml-4"
          >
            ✕
          </button>
        </div>

        {/* Details */}
        <div className="px-8 py-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_date")}</p>
              <p className="text-lg font-semibold text-gray-900">
                {parseInt(dd)} {monthName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_time")}</p>
              <p className="text-lg font-semibold text-gray-900">
                {booking.scheduled_start?.slice(0, 5)} - {endFormatted}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_duration")}</p>
              <p className="text-lg font-semibold text-gray-900">
                {booking.duration_hours}{t("req_h")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_address")}</p>
              <p className="text-lg font-semibold text-gray-900">{booking.address}</p>
            </div>
          </div>

          {booking.notes && (
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_notes")}</p>
              <p className="text-lg text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{booking.notes}</p>
            </div>
          )}

          {booking.profiles?.phone && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-4">
              <p className="text-sm text-green-600 uppercase tracking-wide mb-1">{t("req_customer_phone")}</p>
              <a
                href={`tel:${booking.profiles.phone}`}
                className="text-lg font-semibold text-green-800 hover:underline"
              >
                {booking.profiles.phone}
              </a>
            </div>
          )}
        </div>

        <div className="px-8 pb-8">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {t("req_done")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
