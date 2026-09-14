"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/context/LangContext";
import { cancelClean, rateCustomer } from "../../actions";
import { StarRatingInput } from "@/components/StarRating";
import BookingRequestSummary from "@/components/BookingRequestSummary";
import { buildBookingSummaryData } from "@/lib/bookingSummary";
import type { BookingWithCustomer } from "@/types/database";

export default function CleanDetailModal({
  booking,
  onClose,
  hourlyRate,
}: {
  booking: BookingWithCustomer;
  onClose: () => void;
  hourlyRate?: number | null;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const summaryData = buildBookingSummaryData(booking, booking.home_info, hourlyRate);

  // Only an accepted clean can be cancelled by the cleaner. Pending requests are
  // answered from /cleaner/requests; completed/cancelled cleans are terminal.
  // Once accepted, the booking's terms are locked — editing was removed to
  // avoid post-match miscommunication between the host and cleaner; a cleaner
  // whose plans change cancels instead (which notifies the host and reopens
  // the freed time on the calendar).
  const cancellable = booking.status === "accepted";

  // Rating — only for completed cleans (cleaner rates the customer). Seeds from
  // any score already given; persists on each star click.
  const [rating, setRating] = useState<number | null>(booking.my_rating ?? null);
  const [ratingErr, setRatingErr] = useState(false);
  const [ratingPending, startRating] = useTransition();
  const [reviewText, setReviewText] = useState(booking.my_review_text ?? "");
  const [reviewSaved, setReviewSaved] = useState(false);

  function handleRate(score: number) {
    setRatingErr(false);
    const prev = rating;
    setRating(score);
    startRating(async () => {
      const res = await rateCustomer(booking.id, score, reviewText);
      if (res?.error) {
        setRating(prev);
        setRatingErr(true);
        return;
      }
      router.refresh();
    });
  }

  function handleSaveReview() {
    if (rating == null) return;
    setRatingErr(false);
    setReviewSaved(false);
    startRating(async () => {
      const res = await rateCustomer(booking.id, rating, reviewText);
      if (res?.error) {
        setRatingErr(true);
        return;
      }
      setReviewSaved(true);
      router.refresh();
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const res = await cancelClean(booking.id);
      if (res?.error) {
        // Surface the real reason (DB/RLS message or guard) instead of a generic
        // string, so failures are diagnosable rather than silently opaque.
        setError(res.error || t("req_cancel_error"));
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
          <BookingRequestSummary
            data={summaryData}
            cleanerName={booking.profiles?.full_name ?? t("req_customer")}
            lang={lang}
          />
          {booking.duration_flexible && (
            <p className="text-sm font-semibold text-red-600">{t("req_duration_not_sure")}</p>
          )}

          <div>
            <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t("req_address")}</p>
            <p className="text-lg font-semibold text-gray-900">{booking.address}</p>
          </div>

          {booking.avail_window_start && booking.avail_window_end && (
            <div className="bg-blue-50 rounded-xl px-4 py-3">
              <p className="text-sm text-blue-600 uppercase tracking-wide mb-1">{t("req_avail_window")}</p>
              <p className="text-lg font-semibold text-blue-900">
                {booking.avail_window_start.slice(0, 5)} – {booking.avail_window_end.slice(0, 5)}
              </p>
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

          {booking.status === "completed" && (
            <div className="border-t border-gray-100 pt-5">
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-2">{t("rate_title")}</p>
              <div className="flex items-center gap-3">
                <StarRatingInput value={rating} onChange={handleRate} disabled={ratingPending} />
                {ratingPending && <span className="text-sm text-gray-400">{t("rate_saving")}</span>}
                {!ratingPending && rating != null && !ratingErr && (
                  <span className="text-sm text-gray-500">{t("rate_saved")}: {rating}/5</span>
                )}
              </div>
              {ratingErr && <p className="text-sm text-red-600 mt-1">{t("rate_error")}</p>}

              {rating != null && (
                <div className="mt-3">
                  <textarea
                    value={reviewText}
                    onChange={(e) => {
                      setReviewText(e.target.value);
                      setReviewSaved(false);
                    }}
                    rows={2}
                    maxLength={500}
                    placeholder={t("rate_review_placeholder")}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={handleSaveReview}
                      disabled={ratingPending}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      {t("rate_review_save")}
                    </button>
                    {ratingPending && <span className="text-sm text-gray-400">{t("rate_saving")}</span>}
                    {!ratingPending && reviewSaved && (
                      <span className="text-sm text-gray-400">{t("rate_saved")}</span>
                    )}
                  </div>
                </div>
              )}
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
