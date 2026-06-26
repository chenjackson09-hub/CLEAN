"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editBooking } from "../actions";
import { useLang } from "@/context/LangContext";
import type { BookingWithCustomer } from "@/types/database";

const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8];

// Explicit 24-hour HH:MM options (every 30 min). A native <input type="time">
// renders in the browser's locale, which can show a 12-hour AM/PM clock; a
// select with preformatted values guarantees a 24-hour display everywhere.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
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
  const [start, setStart] = useState(booking.scheduled_start.slice(0, 5));
  const [duration, setDuration] = useState(booking.duration_hours);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await editBooking(booking.id, {
        scheduled_start: start,
        duration_hours: duration,
        appendNote: note.trim() || undefined,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="px-8 pb-8 space-y-4">
      <h3 className="font-bold text-gray-900">{t("req_edit_title")}</h3>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="edit-start" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("req_time")}
          </label>
          <select
            id="edit-start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
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
            onChange={(e) => setDuration(Number(e.target.value))}
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

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={pending}
          className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 text-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60"
        >
          {t("req_edit_cancel")}
        </button>
        <button
          onClick={handleSave}
          disabled={pending}
          className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {pending ? t("req_edit_saving") : t("req_edit_save")}
        </button>
      </div>
    </div>
  );
}
