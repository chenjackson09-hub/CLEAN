"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addAvailability, deleteAvailability } from "../../actions";
import type { CleanerAvailability, CleanerWeeklyAvailability, Booking } from "@/types/database";
import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";
import { TIME_SLOTS, SlotLabel, slotLabel } from "./utils";

const WEEK_DAY_KEYS: TranslationKey[] = [
  "day_sun", "day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat",
];
const MONTH_KEYS: TranslationKey[] = [
  "month_jan", "month_feb", "month_mar", "month_apr", "month_may", "month_jun",
  "month_jul", "month_aug", "month_sep", "month_oct", "month_nov", "month_dec",
];

const SLOT_KEYS: Record<SlotLabel, TranslationKey> = {
  Morning: "slot_morning",
  Noon:    "slot_noon",
  Evening: "slot_evening",
};

function getSunday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function get4Weeks(): Date[] {
  const sunday = getSunday(new Date());
  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
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

function dayCardColor(
  allSlots: Array<{ start_time: string }>,
  hasAccepted: boolean,
  hasPending: boolean,
): string {
  if (hasAccepted) return "bg-blue-500 hover:bg-blue-600";
  if (hasPending)  return "bg-blue-200 hover:bg-blue-300";
  if (allSlots.length === 0) return "bg-gray-100 hover:bg-gray-200";
  return "bg-blue-100 hover:bg-blue-200";
}

interface Props {
  slots: CleanerAvailability[];
  weeklySlots: CleanerWeeklyAvailability[];
  bookings: Booking[];
  pendingBookings: Booking[];
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
  const [columns, setColumns] = useState(7);
  const [panel, setPanel] = useState<DayPanel>({ open: false, dateStr: "", past: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<SlotLabel>>(new Set());

  const days = get4Weeks();
  const rows: Date[][] = [];
  for (let i = 0; i < days.length; i += columns) {
    rows.push(days.slice(i, i + columns));
  }

  const slotsByDate = slots.reduce<Record<string, CleanerAvailability[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  const bookingsByDate = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    if (!acc[b.scheduled_date]) acc[b.scheduled_date] = [];
    acc[b.scheduled_date].push(b);
    return acc;
  }, {});

  const pendingByDate = pendingBookings.reduce<Record<string, Booking[]>>((acc, b) => {
    if (!acc[b.scheduled_date]) acc[b.scheduled_date] = [];
    acc[b.scheduled_date].push(b);
    return acc;
  }, {});

  function openPanel(day: Date) {
    setError(null);
    setSelected(new Set());
    setPanel({ open: true, dateStr: toLocalDateStr(day), past: isPast(day) });
  }

  function toggleSlot(label: SlotLabel) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  function closePanel() {
    setPanel({ open: false, dateStr: "", past: false });
    setError(null);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    for (const label of TIME_SLOTS.map((ts) => ts.label).filter((l) => selected.has(l) && !existingLabels.has(l))) {
      const ts = TIME_SLOTS.find((t) => t.label === label)!;
      const formData = new FormData();
      formData.set("date", panel.dateStr);
      formData.set("start_time", ts.start);
      formData.set("end_time", ts.end);
      const result = await addAvailability(formData);
      if (result?.error) { setError(result.error); setLoading(false); return; }
    }
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
  const panelRecurring = [...(panel.dateStr
    ? weeklySlots.filter((s) => {
        const d = new Date(panel.dateStr + "T12:00:00");
        return s.day_of_week === d.getDay();
      })
    : [])].sort((a, b) => a.start_time.localeCompare(b.start_time));

  const existingLabels = new Set([
    ...panelRecurring.map((s) => slotLabel(s.start_time, s.end_time)),
    ...panelSlots.map((s) => slotLabel(s.start_time, s.end_time)),
  ]);

  function formatFullDate(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    return `${t(WEEK_DAY_KEYS[d.getDay()])}, ${d.getDate()} ${t(MONTH_KEYS[d.getMonth()])} ${d.getFullYear()}`;
  }

  return (
    <>
      {/* Column control */}
      <div className="flex items-center justify-end px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setColumns((c) => Math.max(1, c - 1))}
            disabled={columns === 1}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-xl font-bold flex items-center justify-center"
          >
            +
          </button>
          <button
            onClick={() => setColumns((c) => Math.min(7, c + 1))}
            disabled={columns === 7}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-xl font-bold flex items-center justify-center"
          >
            −
          </button>
        </div>
      </div>

      {/* Day headers — only when columns = 7 */}
      {columns === 7 && (
        <div className="px-3 pt-2">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {WEEK_DAY_KEYS.map((key) => (
              <div key={key} className="text-center text-sm font-bold text-gray-500 py-1">
                {t(key)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar rows */}
      <div className="p-3 space-y-2">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {row.map((day) => {
              const dateStr = toLocalDateStr(day);
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
                : dayCardColor([...daySlots, ...recurring], hasAccepted, hasPending);

              const dateTextColor = hasAccepted ? "text-white" : "text-gray-700";
              const dayNameColor = hasAccepted ? "text-blue-100" : "text-gray-400";

              return (
                <button
                  key={dateStr}
                  onClick={() => openPanel(day)}
                  className={`flex flex-col items-center p-3 min-h-[90px] rounded-xl transition-colors ${today ? "ring-2 ring-black" : ""} ${colorClass}`}
                >
                  <span className={`text-xl font-bold w-10 h-10 flex items-center justify-center ${dateTextColor}`}>
                    {day.getDate()}
                  </span>
                  {columns < 7 && (
                    <span className={`text-xs font-medium mt-0.5 ${dayNameColor}`}>{t(WEEK_DAY_KEYS[day.getDay()])}</span>
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

      {/* Day detail panel */}
      {panel.open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={closePanel}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                  {panel.past ? t("avail_past_day") : t("nav_availability")}
                </p>
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

            {/* Slots list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {panelRecurring.length === 0 && panelSlots.length === 0 && panelBookings.length === 0 ? (
                <p className="text-base text-gray-400 text-center py-4">
                  {panel.past ? t("avail_no_hours_past") : t("avail_no_hours")}
                </p>
              ) : (
                <>
                  {panelBookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3"
                    >
                      <p className="text-xs font-medium text-orange-500 mb-0.5">{t("avail_booked")}</p>
                      <p className="text-lg font-semibold text-orange-800">
                        {b.scheduled_start.slice(0, 5)} · {b.duration_hours}{t("req_h")}
                      </p>
                      <p className="text-sm text-orange-700 mt-0.5">{b.address}</p>
                    </div>
                  ))}
                  {panelRecurring.map((slot) => {
                    const label = slotLabel(slot.start_time, slot.end_time) as SlotLabel;
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3"
                      >
                        <div>
                          <p className="text-xs font-medium text-indigo-400 mb-0.5">{t("avail_recurring_label")}</p>
                          <p className="text-lg font-semibold text-indigo-700">
                            {SLOT_KEYS[label] ? t(SLOT_KEYS[label]) : label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {panelSlots.map((slot) => {
                    const label = slotLabel(slot.start_time, slot.end_time) as SlotLabel;
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3"
                      >
                        <div>
                          <p className="text-lg font-semibold text-blue-800">
                            {SLOT_KEYS[label] ? t(SLOT_KEYS[label]) : label}
                          </p>
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
                    );
                  })}
                </>
              )}
            </div>

            {/* Add slot — only for non-past days */}
            {!panel.past && (
              <div className="border-t border-gray-100 px-6 py-5">
                <p className="text-base font-semibold text-gray-700 mb-3">{t("avail_add_section")}</p>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {TIME_SLOTS.map((ts) => (
                      <button
                        key={ts.label}
                        type="button"
                        disabled={existingLabels.has(ts.label)}
                        onClick={() => toggleSlot(ts.label)}
                        className={`rounded-xl border-2 py-3 text-center transition-colors ${
                          existingLabels.has(ts.label)
                            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                            : selected.has(ts.label)
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                        }`}
                      >
                        <p className="text-sm font-semibold">{t(SLOT_KEYS[ts.label])}</p>
                        <p className="text-xs mt-0.5 opacity-70">{ts.start}–{ts.end}</p>
                      </button>
                    ))}
                  </div>
                  {error && <p className="text-base text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || selected.size === 0}
                    className="w-full bg-blue-600 text-white rounded-xl py-3 text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? t("avail_adding") : t("avail_add")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
