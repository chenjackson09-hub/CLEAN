"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/context/LangContext";
import { cancelClean } from "../../actions";
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
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [, mm, dd] = booking.scheduled_date.split("-");
  const monthName = t(MONTH_KEYS[parseInt(mm) - 1]);
  const start = new Date(`1970-01-01T${booking.scheduled_start}`);
  const end = new Date(start.getTime() + booking.duration_hours * 60 * 60 * 1000);
  const endFormatted = end.toTimeString().slice(0, 5);

  // Only an accepted clean can be cancelled by the cleaner. Pending requests are
  // answered from /cleaner/requests; completed/cancelled cleans are terminal.
  const cancellable = booking.status === "accepted";

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const res = await cancelClean(booking.id);
      if (res?.error) {
        setError(t("req_cancel_error"));
        return;
      }
      onClose();
      router.refresh();
    });
  }

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
        <div className="flex items-start justify-between px-8 pt-8 pb-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="shrink-0 w-14 h-14 rounded-full bg-gray-100 overflow-hidden">
              {booking.profiles?.avatar_url ? (
                <Image
                  src={booking.profiles.avatar_url}
                  alt={booking.profiles.full_name ?? t("req_customer")}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-gray-900">
                {booking.profiles?.full_name ?? t("req_customer")}
              </h2>
              {booking.customer_id && (
                <Link
                  href={`/cleaner/customers/${booking.customer_id}?from=dashboard`}
                  className="inline-flex items-center gap-1 p-1 px-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 mt-1"
                >
                  {t("req_view_profile")}
                  <span aria-hidden></span>
                </Link>
              )}
            </div>
          </div>
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
            <div className="bg-green-100 rounded-xl px-5 py-4">
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

        {cancellable && (
          <div className="px-8 pb-8 space-y-3">
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            {confirming ? (
              <>
                <p className="text-sm text-gray-600 text-center">{t("req_cancel_confirm")}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={pending}
                    className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-4 text-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60"
                  >
                    {t("req_cancel_no")}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={pending}
                    className="flex-1 bg-red-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {pending ? t("req_cancelling") : t("req_cancel_yes")}
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="w-full bg-red-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-red-700 transition-colors"
              >
                {t("req_cancel")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
