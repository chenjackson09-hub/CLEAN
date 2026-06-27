"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editBooking } from "../actions";
import { useLang } from "@/context/LangContext";
import type { BookingWithCustomer } from "@/types/database";

const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8];

// Explicit 24-hour HH:MM options (every 30 min), limited to the working window
// 06:00–22:00. A native <input type="time"> renders in the browser's locale,
// which can show a 12-hour AM/PM clock; a select with preformatted values
// guarantees a 24-hour display everywhere.
const START_HOUR = 6;
const END_HOUR = 22;
const TIME_OPTIONS = Array.from({ length: (END_HOUR - START_HOUR) * 2 + 1 }, (_, i) => {
  const total = START_HOUR * 60 + i * 30;
  const h = Math.floor(total / 60);
  const m = total % 60 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

// Shared cleaner-side editor for a booking's start time / duration plus an
// appended note. Used inside both the requests modal (pending requests) and the
// dashboard's CleanDetailModal (accepted cleans). On success the parent closes
// itself; editBooking revalidates and we router.refresh() so the list updates.
export default function EditBookingForm({
  booking,
  onDone,
  onCancel,
}: {
  booking: BookingWithCustomer;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
  const [date, setDate] = useState(booking.scheduled_date);
  const [start, setStart] = useState(booking.scheduled_start.slice(0, 5));
  const [duration, setDuration] = useState(booking.duration_hours);
  // Lets the cleaner keep the customer's "Not sure" duration marker instead of
  // resolving it. Defaults to whatever the booking already carries.
  const [keepFlexible, setKeepFlexible] = useState(booking.duration_flexible);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Set when the chosen time is outside marked availability: we show a warning
  // and let the cleaner save anyway (re-submitting with `force`).
  const [confirmOutside, setConfirmOutside] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave(force = false) {
    setError(null);
    startTransition(async () => {
      const res = await editBooking(booking.id, {
        scheduled_start: start,
        scheduled_date: date,
        duration_hours: duration,
        duration_flexible: keepFlexible,
        appendNote: note.trim() || undefined,
        force,
      });
      if (res?.needsConfirm) {
        setConfirmOutside(true);
        return;
      }
      if (res?.error) {
        setConfirmOutside(false);
        setError(res.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  // Changing the time/duration clears a pending out-of-availability warning so
  // it re-validates fresh on the next save.
  function clearConfirm() {
    if (confirmOutside) setConfirmOutside(false);
  }

  return (
    <div className="px-8 pb-8 space-y-4">
      <h3 className="font-bold text-gray-900">{t("req_edit_title")}</h3>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-date" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t("req_date")}
        </label>
        <input
          id="edit-date"
          type="date"
          value={date}
          min={today}
          onChange={(e) => {
            setDate(e.target.value);
            clearConfirm();
          }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="edit-start" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("req_time")}
          </label>
          <select
            id="edit-start"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              clearConfirm();
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {/* Keep the booking's current time selectable even if it isn't on a
                30-minute boundary. */}
            {!TIME_OPTIONS.includes(start) && <option value={start}>{start}</option>}
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="edit-duration" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("req_duration")}
          </label>
          <select
            id="edit-duration"
            value={duration}
            onChange={(e) => {
              setDuration(Number(e.target.value));
              clearConfirm();
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
                {t("req_h")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label htmlFor="edit-flexible" className="flex items-center gap-2 cursor-pointer">
        <input
          id="edit-flexible"
          type="checkbox"
          checked={keepFlexible}
          onChange={(e) => setKeepFlexible(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <span className="text-sm font-semibold text-red-600">{t("req_duration_not_sure")}</span>
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-note" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t("req_edit_add_note")}
        </label>
        <textarea
          id="edit-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={t("req_edit_note_placeholder")}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {confirmOutside && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
          {t("req_edit_outside_warning")}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={pending}
          className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 text-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60"
        >
          {t("req_edit_cancel")}
        </button>
        <button
          onClick={() => handleSave(confirmOutside)}
          disabled={pending}
          className={`flex-1 text-white rounded-xl py-3 text-lg font-semibold transition-colors disabled:opacity-60 ${
            confirmOutside ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {pending
            ? t("req_edit_saving")
            : confirmOutside
              ? t("req_edit_save_anyway")
              : t("req_edit_save")}
        </button>
      </div>
    </div>
  );
}
