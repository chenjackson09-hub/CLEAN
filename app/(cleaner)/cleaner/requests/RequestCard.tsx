"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { respondToBooking } from "../../actions";
import EditBookingForm from "../EditBookingForm";
import { useLang } from "@/context/LangContext";
import type { BookingWithCustomer, BookingStatus } from "@/types/database";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  accepted:  "bg-green-100 text-green-700",
  declined:  "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function Countdown({ deadline }: { deadline: string }) {
  const { t } = useLang();
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setRemaining(t("req_expired")); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}${t("req_h")} ${m}${t("req_m_left")}`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [deadline, t]);

  return <span className="text-xs text-orange-500 font-medium">{remaining}</span>;
}

interface Props {
  booking: BookingWithCustomer;
  showActions: boolean;
}

export default function RequestCard({ booking, showActions }: Props) {
  const { t } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(booking.status);
  // Accept and decline both ask for confirmation first.
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [confirmingAccept, setConfirmingAccept] = useState(false);
  const [editing, setEditing] = useState(false);

  const svcLabel: Record<string, string> = {
    residential: t("svc_residential"),
    commercial: t("svc_commercial"),
  };

  async function handleRespond(response: "accepted" | "declined") {
    setLoading(response);
    setError(null);
    const result = await respondToBooking(booking.id, response);
    setLoading(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setCurrentStatus(response);
    // On decline, dismiss right away. On accept, keep the modal open so the
    // cleaner can read the customer's phone number until they close it.
    if (response === "declined") {
      setOpen(false);
      router.refresh();
    }
  }

  // Closing the modal after a response refreshes the list so the answered card
  // drops off (the page only lists still-pending requests). We deliberately
  // don't auto-refresh on accept, so the phone number stays put until dismissal.
  function handleClose() {
    setOpen(false);
    setConfirmingDecline(false);
    setConfirmingAccept(false);
    setEditing(false);
    if (currentStatus !== "pending") router.refresh();
  }

  return (
    <>
      {/* ── Card ── */}
      <div className="bg-white rounded-2xl p-6 flex items-center shadow-md justify-between gap-6">
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
            {booking.customer_id ? (
              <Link
                href={`/cleaner/customers/${booking.customer_id}`}
                className="font-semibold text-gray-900 text-xl truncate hover:text-blue-600 hover:underline transition-colors"
              >
                {booking.profiles?.full_name ?? t("req_customer")}
              </Link>
            ) : (
              <div className="font-semibold text-gray-900 text-xl truncate">
                {booking.profiles?.full_name ?? t("req_customer")}
              </div>
            )}
            <div className="text-base text-gray-500 mt-1 truncate">{booking.address}</div>
            <div className="flex items-center gap-3 mt-3">
              {currentStatus === "pending" && (
                <Countdown deadline={booking.response_deadline} />
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 bg-blue-600 text-white text-base font-semibold px-4 py-2 rounded-full hover:bg-blue-700 transition-colors"
        >
          {t("req_watch")}
        </button>
      </div>

      {/* ── Detail modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={handleClose}
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
                  href={`/cleaner/customers/${booking.customer_id}`}
                  className="inline-flex items-center gap-1 p-1 px-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 mt-1"
                >
                  {t("req_view_profile")}
                  <span aria-hidden></span>
                </Link>
              )}
            </div>
          </div>
              <button
                onClick={handleClose}
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
                  <p className="text-lg font-semibold text-gray-900">{formatDate(booking.scheduled_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_time")}</p>
                  <p className="text-lg font-semibold text-gray-900">{booking.scheduled_start?.slice(0, 5)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_duration")}</p>
                  <p className="text-lg font-semibold text-gray-900">{booking.duration_hours}{t("req_h")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_service")}</p>
                  <p className="text-lg font-semibold text-gray-900">{svcLabel[booking.service_type] ?? booking.service_type}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_address")}</p>
                <p className="text-lg font-semibold text-gray-900">{booking.address}</p>
              </div>

              {booking.notes && (
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_notes")}</p>
                  <p className="text-lg text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{booking.notes}</p>
                </div>
              )}

              {currentStatus === "accepted" && booking.profiles?.phone && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-4">
                  <p className="text-sm text-green-600 uppercase tracking-wide mb-1">{t("req_customer_phone")}</p>
                  <p className="text-lg font-semibold text-green-800">{booking.profiles.phone}</p>
                </div>
              )}

              {error && (
                <p className="text-base text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
              )}
            </div>

            {/* Edit (start time / duration / note) — pending requests only */}
            {showActions && currentStatus === "pending" && editing && (
              <EditBookingForm
                booking={booking}
                onDone={handleClose}
                onCancel={() => setEditing(false)}
              />
            )}

            {/* Actions */}
            {showActions && currentStatus === "pending" && !editing && (
              <div className="px-8 pb-8">
                {confirmingDecline ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 text-center">{t("req_decline_confirm")}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmingDecline(false)}
                        disabled={!!loading}
                        className="flex-1 bg-gray-100 text-gray-700 rounded-full py-3 text-lg font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        {t("req_decline_no")}
                      </button>
                      <button
                        onClick={() => handleRespond("declined")}
                        disabled={!!loading}
                        className="flex-1 bg-red-500 text-white rounded-full py-3 text-lg font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        {loading === "declined" ? t("req_declining") : t("req_decline_yes")}
                      </button>
                    </div>
                  </div>
                ) : confirmingAccept ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 text-center">{t("req_accept_confirm")}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmingAccept(false)}
                        disabled={!!loading}
                        className="flex-1 bg-gray-100 text-gray-700 rounded-full py-3 text-lg font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        {t("req_accept_no")}
                      </button>
                      <button
                        onClick={() => handleRespond("accepted")}
                        disabled={!!loading}
                        className="flex-1 bg-green-600 text-white rounded-full py-3 text-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {loading === "accepted" ? t("req_accepting") : t("req_accept_yes")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmingAccept(true)}
                        disabled={!!loading}
                        className="flex-1 bg-green-600 text-white rounded-full py-3 text-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {t("req_accept")}
                      </button>
                      <button
                        onClick={() => setConfirmingDecline(true)}
                        disabled={!!loading}
                        className="flex-1 bg-red-500 text-white rounded-full py-2 text-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        {t("req_decline")}
                      </button>
                    </div>
                    <button
                      onClick={() => setEditing(true)}
                      disabled={!!loading}
                      className="w-full border border-gray-300 text-gray-700 rounded-full py-2 text-base font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      {t("req_edit")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* After accepting, the modal stays open so the cleaner can note the
                customer's phone; an explicit Done button closes it. */}
            {currentStatus === "accepted" && (
              <div className="px-8 pb-8">
                <button
                  onClick={handleClose}
                  className="w-full bg-green-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  {t("req_done")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
