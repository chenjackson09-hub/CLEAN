"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addAvailability, deleteAvailability } from "../../actions";
import type { CleanerAvailability, CleanerWeeklyAvailability, BookingWithCustomer } from "@/types/database";
import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";

const WEEK_DAY_KEYS: TranslationKey[] = [
  "day_sun", "day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat",
];
const MONTH_KEYS: TranslationKey[] = [
  "month_jan", "month_feb", "month_mar", "month_apr", "month_may", "month_jun",
  "month_jul", "month_aug", "month_sep", "month_oct", "month_nov", "month_dec",
];

// Separate hour (06 → 22) and minute (00/15/30/45) options for the start/end pickers.
const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

function formatRange(start: string, end: string): string {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

interface Cell {
  date: Date;
  inMonth: boolean;
}

function buildMonthCells(viewDate: Date, withAdjacent: boolean): Cell[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthCells: Cell[] = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    d.setHours(0, 0, 0, 0);
    return { date: d, inMonth: true };
  });
  if (!withAdjacent) return monthCells;

  // Leading days from the previous month so the 1st lands under the right weekday.
  const cells: Cell[] = [];
  const lead = monthCells[0].date.getDay();
  for (let i = lead; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    d.setHours(0, 0, 0, 0);
    cells.push({ date: d, inMonth: false });
  }
  cells.push(...monthCells);
  // Trailing days from the next month to complete the final week.
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    cells.push({ date: d, inMonth: false });
  }
  return cells;
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(d: Date): boolean {
  return toLocalDateStr(d) === toLocalDateStr(new Date());
}

function isPast(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

// Three states only: booked (an accepted clean), free to work (marked
// availability, whether or not a request is pending on it), or unavailable
// (no marked availability). A pending request is a separate signal — the red
// count badge rendered on the cell — not its own color bucket, since a
// pending request doesn't change whether the cleaner is actually free.
function dayCardColor(
  allSlots: Array<{ start_time: string }>,
  hasAccepted: boolean,
): string {
  if (hasAccepted) return "bg-blue-500 hover:bg-blue-600";
  if (allSlots.length === 0) return "bg-gray-100 hover:bg-gray-200";
  return "bg-blue-100 hover:bg-blue-200";
}

interface Props {
  slots: CleanerAvailability[];
  weeklySlots: CleanerWeeklyAvailability[];
  bookings: BookingWithCustomer[];
  pendingBookings: BookingWithCustomer[];
}

interface DayPanel {
  open: boolean;
  dateStr: string;
  past: boolean;
}

export default function CalendarGrid({ slots: initialSlots, weeklySlots, bookings, pendingBookings }: Props) {
  const { t } = useLang();
  const router = useRouter();
  const [slots, setSlots] = useState(initialSlots);

  useEffect(() => {
    setSlots(initialSlots);
  }, [initialSlots]);
  const [viewDate, setViewDate] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [panel, setPanel] = useState<DayPanel>({ open: false, dateStr: "", past: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [note, setNote] = useState("");
  // The add form is collapsed by default — an empty day just looks empty,
  // and the + button (bottom-right of the panel) reveals it.
  const [addOpen, setAddOpen] = useState(false);
  const panelScrollRef = useRef<HTMLDivElement>(null);

  const cells = buildMonthCells(viewDate, true);
  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  function prevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const slotsByDate = slots.reduce<Record<string, CleanerAvailability[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  const bookingsByDate = bookings.reduce<Record<string, BookingWithCustomer[]>>((acc, b) => {
    if (!acc[b.scheduled_date]) acc[b.scheduled_date] = [];
    acc[b.scheduled_date].push(b);
    return acc;
  }, {});

  const pendingByDate = pendingBookings.reduce<Record<string, BookingWithCustomer[]>>((acc, b) => {
    if (!acc[b.scheduled_date]) acc[b.scheduled_date] = [];
    acc[b.scheduled_date].push(b);
    return acc;
  }, {});

  function openPanel(day: Date) {
    setError(null);
    setStartTime("09:00");
    setEndTime("13:00");
    setNote("");
    setAddOpen(false);
    setPanel({ open: true, dateStr: toLocalDateStr(day), past: isPast(day) });
  }

  function closePanel() {
    setPanel({ open: false, dateStr: "", past: false });
    setError(null);
  }

  function openAdd() {
    setAddOpen(true);
    requestAnimationFrame(() => panelScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (endTime <= startTime) {
      setError(t("avail_end_after_start"));
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("date", panel.dateStr);
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("note", note);
    const result = await addAvailability(formData);
    if (result?.error) { setError(result.error); setLoading(false); return; }
    // Collapse back down once the slot is added — the day block stays clean,
    // and adding another time means pressing + again.
    setStartTime("09:00");
    setEndTime("13:00");
    setNote("");
    setAddOpen(false);
    router.refresh();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const result = await deleteAvailability(id);
    if (result?.error) {
      setError(result.error);
    } else {
      setSlots((prev) => prev.filter((s) => s.id !== id));
    }
  }

  const panelSlots = [...(slotsByDate[panel.dateStr] ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const panelBookings = bookingsByDate[panel.dateStr] ?? [];
  const panelPending = [...(pendingByDate[panel.dateStr] ?? [])].sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
  const panelRecurring = [...(panel.dateStr
    ? weeklySlots.filter((s) => {
        const d = new Date(panel.dateStr + "T12:00:00");
        return s.day_of_week === d.getDay();
      })
    : [])].sort((a, b) => a.start_time.localeCompare(b.start_time));

  function formatFullDate(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    return `${t(WEEK_DAY_KEYS[d.getDay()])}, ${d.getDate()} ${t(MONTH_KEYS[d.getMonth()])} ${d.getFullYear()}`;
  }

  return (
    <>
      {/* Month control */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 sticky top-0 z-10">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center"
        >
          ‹
        </button>
        <h2 className="text-lg font-bold text-gray-900 min-w-[150px] text-center">
          {t(MONTH_KEYS[viewDate.getMonth()])} {viewDate.getFullYear()}
        </h2>
        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="px-3 pt-2">
        <div className="grid grid-cols-7 gap-1">
          {WEEK_DAY_KEYS.map((key) => (
            <div key={key} className="text-center text-sm font-bold text-gray-500 py-1">
              {t(key)}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar rows */}
      <div className="p-3 space-y-2">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-2">
            {row.map((cell) => {
              const day = cell.date;
              const dateStr = toLocalDateStr(day);

              // Faint preview of days that belong to the previous/next month.
              if (!cell.inMonth) {
                return (
                  <button
                    key={dateStr}
                    onClick={() => setViewDate(new Date(day.getFullYear(), day.getMonth(), 1))}
                    className="flex flex-col items-center p-3 min-h-[90px] rounded-xl shadow-md transition-opacity opacity-30 bg-gray-50 hover:opacity-60"
                  >
                    <span className="text-sm font-bold w-6 h-6 flex items-center justify-center text-gray-400">
                      {day.getDate()}
                    </span>
                  </button>
                );
              }

              const daySlots = [...(slotsByDate[dateStr] ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time));
              const recurring = [...weeklySlots.filter((s) => s.day_of_week === day.getDay())].sort((a, b) => a.start_time.localeCompare(b.start_time));
              const dayBookings = bookingsByDate[dateStr] ?? [];
              const dayPending = pendingByDate[dateStr] ?? [];
              const past = isPast(day);
              const today = isToday(day);

              const hasAccepted = dayBookings.length > 0;
              const hasPending = dayPending.length > 0;
              const colorClass = past
                ? "bg-gray-50 hover:bg-gray-100 opacity-40"
                : dayCardColor([...daySlots, ...recurring], hasAccepted);
              // Quick-glance preview of what's scheduled — up to 2 hour-only
              // time ranges from this day's own added slots, no notes, "+N"
              // for the rest. Full detail (minutes, notes) is one tap away.
              const chipTextColor = hasAccepted ? "text-blue-50" : "text-blue-800";
              const visibleSlots = daySlots.slice(0, 2);
              const extraSlotCount = daySlots.length - visibleSlots.length;

              return (
                <button
                  key={dateStr}
                  onClick={() => openPanel(day)}
                  className={`flex flex-col items-center p-3 min-h-[90px] rounded-xl shadow-md transition-colors ${today ? "ring-2 ring-black" : ""} ${colorClass}`}
                >
                  <span className="text-sm font-bold w-6 h-6 flex items-center justify-center text-gray-900">
                    {day.getDate()}
                  </span>
                  {visibleSlots.length > 0 && (
                    <div className={`flex flex-col items-center leading-tight ${chipTextColor}`}>
                      {visibleSlots.map((slot) => (
                        <span key={slot.id} className="text-[10px] font-semibold tabular-nums">
                          {parseInt(slot.start_time.slice(0, 2), 10)}-{parseInt(slot.end_time.slice(0, 2), 10)}
                        </span>
                      ))}
                      {extraSlotCount > 0 && <span className="text-[10px] font-semibold">+{extraSlotCount}</span>}
                    </div>
                  )}
                  {hasPending && (
                    <span className="mt-auto text-sm font-bold text-red-600 leading-none">
                      {dayPending.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex items-center justify-center gap-4 px-4 pt-1 pb-4 flex-wrap text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500" /> {t("avail_legend_booked")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-100" /> {t("avail_legend_available")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300" /> {t("avail_legend_none")}
        </span>
      </div>

      {/* Day detail panel */}
      {panel.open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={closePanel}
        >
          <div
            className="relative bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                {panel.past && (
                  <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                    {t("avail_past_day")}
                  </p>
                )}
                <h2 className="text-2xl font-bold text-gray-900 mt-0.5">
                  {formatFullDate(panel.dateStr)}
                </h2>
              </div>
              <button
                onClick={closePanel}
                className="text-2xl text-gray-400 hover:text-gray-700 font-bold leading-none mt-1"
              >
                ✕
              </button>
            </div>

            {/* Floating add button — bottom-right of the panel, always
                reachable regardless of scroll position. Small and subtle,
                but still visible; it only opens the form (never toggles it
                closed — the form collapses on its own once a slot is added,
                so there's no separate close/cancel control needed here). */}
            {!panel.past && (
              <button
                type="button"
                onClick={openAdd}
                aria-label={t("avail_add_section")}
                aria-expanded={addOpen}
                className="absolute bottom-3 end-3 z-10 w-9 h-9 rounded-full bg-blue-600/90 hover:bg-blue-700 text-white shadow-md flex items-center justify-center text-lg font-light leading-none transition-transform active:scale-95"
              >
                +
              </button>
            )}

            <div ref={panelScrollRef} className="flex-1 overflow-y-auto">
              {/* Pending requests — links to the requests page */}
              {panelPending.length > 0 && (
                <Link
                  href="/cleaner/requests"
                  className="flex items-center justify-between gap-2 mx-6 mt-4 px-4 py-3 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-100 transition-colors"
                >
                  <span>
                    {panelPending.length} {panelPending.length === 1 ? t("avail_pending_request") : t("avail_pending_requests")}
                  </span>
                  <span className="text-lg leading-none">›</span>
                </Link>
              )}

              {/* Add slot — only for non-past days, revealed by the + button and
                  shown at the top so it's the first thing the cleaner sees */}
              {!panel.past && addOpen && (
                <div className="px-6 pt-5 pb-5 border-b border-gray-100">
                  <p className="text-base font-semibold text-gray-700 mb-3">{t("avail_add_section")}</p>
                  <form onSubmit={handleAdd} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-base font-medium text-gray-500">{t("avail_from")}</span>
                        <div dir="ltr" className="mt-1 flex items-center gap-2">
                          <select
                            value={startTime.slice(0, 2)}
                            onChange={(e) => setStartTime(`${e.target.value}:${startTime.slice(3, 5)}`)}
                            className="flex-1 rounded-xl border-2 border-gray-200 bg-white py-3 px-3 text-base font-semibold text-gray-700 focus:border-blue-400 focus:outline-none"
                          >
                            {HOUR_OPTIONS.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <span className="font-bold text-gray-400">:</span>
                          <select
                            value={startTime.slice(3, 5)}
                            onChange={(e) => setStartTime(`${startTime.slice(0, 2)}:${e.target.value}`)}
                            className="flex-1 rounded-xl border-2 border-gray-200 bg-white py-3 px-3 text-base font-semibold text-gray-700 focus:border-blue-400 focus:outline-none"
                          >
                            {MINUTE_OPTIONS.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <span className="text-base font-medium text-gray-500">{t("avail_to")}</span>
                        <div dir="ltr" className="mt-1 flex items-center gap-2">
                          <select
                            value={endTime.slice(0, 2)}
                            onChange={(e) => setEndTime(`${e.target.value}:${endTime.slice(3, 5)}`)}
                            className="flex-1 rounded-xl border-2 border-gray-200 bg-white py-3 px-3 text-base font-semibold text-gray-700 focus:border-blue-400 focus:outline-none"
                          >
                            {HOUR_OPTIONS.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <span className="font-bold text-gray-400">:</span>
                          <select
                            value={endTime.slice(3, 5)}
                            onChange={(e) => setEndTime(`${endTime.slice(0, 2)}:${e.target.value}`)}
                            className="flex-1 rounded-xl border-2 border-gray-200 bg-white py-3 px-3 text-base font-semibold text-gray-700 focus:border-blue-400 focus:outline-none"
                          >
                            {MINUTE_OPTIONS.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-base font-medium text-gray-500">{t("avail_note_label")}</span>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t("avail_note_placeholder")}
                        rows={2}
                        className="mt-1 w-full rounded-xl border-2 border-gray-200 bg-white py-2.5 px-3 text-base text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none resize-none"
                      />
                    </div>

                    {endTime > startTime && minutesOf(endTime) - minutesOf(startTime) <= 60 && (
                      <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ⚠ {t("avail_short_warning")}
                      </p>
                    )}
                    {error && <p className="text-base text-red-600">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading || endTime <= startTime}
                      className="w-full bg-blue-600 text-white rounded-xl py-3 text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? t("avail_adding") : t("avail_add")}
                    </button>
                  </form>
                </div>
              )}

              {/* Slots list — extra bottom padding so the floating + button
                  never overlaps the last item. */}
              <div className="px-6 pt-4 pb-24 space-y-3">
                {panelRecurring.length === 0 && panelSlots.length === 0 && panelBookings.length === 0 ? (
                  <p className="text-base text-gray-400 italic text-center py-4">
                    {panel.past ? t("avail_no_hours_past") : t("avail_no_slots_yet")}
                  </p>
                ) : (
                  <>
                    {panelBookings.map((b) => {
                      const start = new Date(`1970-01-01T${b.scheduled_start}`);
                      const end = new Date(start.getTime() + b.duration_hours * 60 * 60 * 1000);
                      const endStr = end.toTimeString().slice(0, 5);
                      return (
                        <div
                          key={b.id}
                          className="bg-orange-100 rounded-xl px-4 py-3"
                        >
                          <p className="text-sm font-bold text-orange-800 mb-0.5">
                            {t("avail_booked")}{" "}
                            {b.customer_id ? (
                              <Link
                                href={`/cleaner/customers/${b.customer_id}`}
                                className="underline hover:text-orange-600"
                              >
                                {b.profiles?.full_name ?? t("req_customer")}
                              </Link>
                            ) : (
                              b.profiles?.full_name ?? t("req_customer")
                            )}
                          </p>
                          <p className="text-lg font-semibold text-orange-600">
                            {b.scheduled_start.slice(0, 5)} - {endStr} · {b.duration_hours}{t("req_h")}
                          </p>
                          <p className="text-sm text-orange-700 mt-0.5">{b.address}</p>
                        </div>
                      );
                    })}
                    {panelRecurring.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between bg-indigo-100 border border-indigo-100 rounded-xl px-4 py-3"
                      >
                        <div>
                          <p className="text-xs font-medium text-indigo-400 mb-0.5">{t("avail_recurring_label")}</p>
                          <p className="text-lg font-semibold text-indigo-700">
                            {formatRange(slot.start_time, slot.end_time)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {panelSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between bg-blue-100 rounded-xl px-4 py-3"
                      >
                        <div>
                          <p className="text-lg font-semibold text-blue-800">
                            {formatRange(slot.start_time, slot.end_time)}
                          </p>
                          {slot.note && <p className="text-sm text-blue-700 mt-0.5">{slot.note}</p>}
                        </div>
                        {!panel.past && (
                          <button
                            onClick={() => handleDelete(slot.id)}
                            className="text-red-400 hover:text-red-600 text-2xl font-bold leading-none ml-4"
                            title="Remove"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
