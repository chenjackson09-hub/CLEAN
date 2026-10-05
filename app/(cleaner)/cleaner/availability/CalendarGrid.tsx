"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addAvailability, deleteAvailability, updateAvailability } from "../../actions";
import type { CleanerAvailability, CleanerWeeklyAvailability, BookingWithCustomer } from "@/types/database";
import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";
import { findAffectedRequests, minutesOf as slotMinutes } from "@/lib/availabilityImpact";

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

// A day is a list of items, each in one of three states that share one color
// language everywhere (month chips, day cards, legend): free (blue) = marked
// availability, pending (orange) = availability with request(s) on it, or a
// request that doesn't sit inside any availability, booked (green) = an
// accepted clean. Unavailable is simply a day with no items.
type ItemState = "free" | "pending" | "booked";

type DayItem =
  | { kind: "slot"; slot: CleanerAvailability; requests: BookingWithCustomer[]; startMin: number }
  | { kind: "weekly"; slot: CleanerWeeklyAvailability; requests: BookingWithCustomer[]; startMin: number }
  | { kind: "booked"; booking: BookingWithCustomer; startMin: number }
  | { kind: "request"; booking: BookingWithCustomer; startMin: number };

function itemState(item: DayItem): ItemState {
  if (item.kind === "booked") return "booked";
  if (item.kind === "request") return "pending";
  return item.requests.length > 0 ? "pending" : "free";
}

const CHIP_CLASS: Record<ItemState, string> = {
  free: "bg-blue-100 text-blue-800",
  pending: "bg-orange-100 text-orange-700",
  booked: "bg-green-100 text-green-800",
};

// Hour-only for a slot ("9-13"), start time for a booking/request ("09:00") —
// a booking only has a start plus an *estimated* length, never a firm end.
function chipLabel(item: DayItem): string {
  if (item.kind === "slot" || item.kind === "weekly") {
    return `${parseInt(item.slot.start_time.slice(0, 2), 10)}-${parseInt(item.slot.end_time.slice(0, 2), 10)}`;
  }
  return item.booking.scheduled_start.slice(0, 5);
}

// Pending requests belong to the slot their start time falls inside (date
// slots first, then recurring ones); a request outside every slot stands alone.
function buildDayItems(
  daySlots: CleanerAvailability[],
  weekly: CleanerWeeklyAvailability[],
  booked: BookingWithCustomer[],
  pending: BookingWithCustomer[],
): DayItem[] {
  const items: DayItem[] = [
    ...daySlots.map((slot): DayItem => ({ kind: "slot", slot, requests: [], startMin: slotMinutes(slot.start_time) })),
    ...weekly.map((slot): DayItem => ({ kind: "weekly", slot, requests: [], startMin: slotMinutes(slot.start_time) })),
  ];
  const orphans: DayItem[] = [];
  for (const req of pending) {
    const at = slotMinutes(req.scheduled_start);
    const host = items.find(
      (i): i is Extract<DayItem, { kind: "slot" | "weekly" }> =>
        (i.kind === "slot" || i.kind === "weekly") &&
        slotMinutes(i.slot.start_time) <= at &&
        at < slotMinutes(i.slot.end_time),
    );
    if (host) host.requests.push(req);
    else orphans.push({ kind: "request", booking: req, startMin: at });
  }
  return [
    ...items,
    ...orphans,
    ...booked.map((booking): DayItem => ({ kind: "booked", booking, startMin: slotMinutes(booking.scheduled_start) })),
  ].sort((a, b) => a.startMin - b.startMin);
}

function hoursLabel(minutes: number): string {
  const h = minutes / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

// Shared From / To / Note fields for both the add form and the slot editor.
function SlotFields({
  startTime, endTime, note, setStartTime, setEndTime, setNote, t,
}: {
  startTime: string; endTime: string; note: string;
  setStartTime: (v: string) => void; setEndTime: (v: string) => void; setNote: (v: string) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}) {
  const selectCls =
    "flex-1 min-w-0 rounded-xl border-2 border-gray-200 bg-white py-3 px-2 text-base font-semibold text-gray-700 focus:border-blue-400 focus:outline-none";
  const picker = (value: string, set: (v: string) => void) => (
    <div dir="ltr" className="mt-1 flex items-center gap-2">
      <select value={value.slice(0, 2)} onChange={(e) => set(`${e.target.value}:${value.slice(3, 5)}`)} className={selectCls}>
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="font-bold text-gray-400">:</span>
      <select value={value.slice(3, 5)} onChange={(e) => set(`${value.slice(0, 2)}:${e.target.value}`)} className={selectCls}>
        {MINUTE_OPTIONS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-base font-medium text-gray-500">{t("avail_from")}</span>
          {picker(startTime, setStartTime)}
        </div>
        <div>
          <span className="text-base font-medium text-gray-500">{t("avail_to")}</span>
          {picker(endTime, setEndTime)}
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
    </>
  );
}

// Compact "6h free · 2 pending · 1 booked" line under the day title.
function DaySummary({ items, t }: { items: DayItem[]; t: (key: TranslationKey, vars?: Record<string, string | number>) => string }) {
  if (items.length === 0) return null;
  const freeMin = items.reduce(
    (sum, i) => (i.kind === "slot" || i.kind === "weekly" ? sum + slotMinutes(i.slot.end_time) - slotMinutes(i.slot.start_time) : sum),
    0,
  );
  const pendingN = items.reduce(
    (n, i) => n + (i.kind === "request" ? 1 : i.kind === "slot" || i.kind === "weekly" ? i.requests.length : 0),
    0,
  );
  const bookedN = items.filter((i) => i.kind === "booked").length;
  const pill = (dot: string, text: string) => (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600">
      <span className={`w-2.5 h-2.5 rounded-full ${dot}`} /> {text}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 pt-4">
      {freeMin > 0 && pill("bg-blue-400", t("avail_free_hours", { h: hoursLabel(freeMin) }))}
      {pendingN > 0 && pill("bg-orange-400", t("avail_pending_n", { n: pendingN }))}
      {bookedN > 0 && pill("bg-green-500", t("avail_booked_n", { n: bookedN }))}
    </div>
  );
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
  // Slot editor: which date-slot is open for editing (null = none).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("13:00");
  const [editNote, setEditNote] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    setEditingId(null);
    setConfirmDelete(false);
    setPanel({ open: true, dateStr: toLocalDateStr(day), past: isPast(day) });
  }

  function closePanel() {
    setPanel({ open: false, dateStr: "", past: false });
    setError(null);
  }

  function openAdd() {
    setEditingId(null);
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

  function startEdit(slot: CleanerAvailability) {
    setAddOpen(false);
    setError(null);
    setConfirmDelete(false);
    setEditingId(slot.id);
    setEditStart(slot.start_time.slice(0, 5));
    setEditEnd(slot.end_time.slice(0, 5));
    setEditNote(slot.note ?? "");
  }

  function stopEdit() {
    setEditingId(null);
    setConfirmDelete(false);
    setError(null);
  }

  async function handleSaveEdit(id: string) {
    if (editEnd <= editStart) {
      setError(t("avail_end_after_start"));
      return;
    }
    setEditSaving(true);
    setError(null);
    const result = await updateAvailability(id, editStart, editEnd, editNote);
    setEditSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, start_time: editStart, end_time: editEnd, note: editNote.trim() || null } : s)),
    );
    stopEdit();
    router.refresh();
  }

  async function handleDelete(id: string) {
    setEditSaving(true);
    const result = await deleteAvailability(id);
    setEditSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSlots((prev) => prev.filter((s) => s.id !== id));
    stopEdit();
    router.refresh();
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
  const panelItems = buildDayItems(panelSlots, panelRecurring, panelBookings, panelPending);
  // What the cleaner is about to do to the hosts' pending requests, shown
  // before they save or delete (the server applies the same rule).
  const impactBefore = [...panelSlots, ...panelRecurring];
  const editImpact = editingId
    ? findAffectedRequests(
        panelPending,
        impactBefore,
        [...panelSlots.map((s) => (s.id === editingId ? { start_time: editStart, end_time: editEnd } : s)), ...panelRecurring],
      ).length
    : 0;
  const deleteImpact = editingId
    ? findAffectedRequests(panelPending, impactBefore, [...panelSlots.filter((s) => s.id !== editingId), ...panelRecurring]).length
    : 0;

  function formatFullDate(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    return `${t(WEEK_DAY_KEYS[d.getDay()])}, ${d.getDate()} ${t(MONTH_KEYS[d.getMonth()])} ${d.getFullYear()}`;
  }

  return (
    <>
      {/* The month fills the screen: only the grid flexes, so the whole month and
          the key are visible without scrolling. */}
      <div className="flex flex-col flex-1 min-h-0">
      {/* Month control */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-4 py-1.5">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center"
        >
          ‹
        </button>
        <h2 className="text-base font-bold text-gray-900 min-w-[150px] text-center">
          {t(MONTH_KEYS[viewDate.getMonth()])} {viewDate.getFullYear()}
        </h2>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="shrink-0 px-2">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_DAY_KEYS.map((key) => (
            <div key={key} className="text-center text-xs font-bold text-gray-500 py-0.5">
              {t(key)}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar rows */}
      <div
        className="flex-1 min-h-0 grid gap-1.5 p-2"
        style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}
      >
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-1.5 min-h-0">
            {row.map((cell) => {
              const day = cell.date;
              const dateStr = toLocalDateStr(day);

              // Faint preview of days that belong to the previous/next month.
              if (!cell.inMonth) {
                return (
                  <button
                    key={dateStr}
                    onClick={() => setViewDate(new Date(day.getFullYear(), day.getMonth(), 1))}
                    className="flex flex-col items-center py-1.5 min-h-0 overflow-hidden rounded-xl shadow-md transition-opacity opacity-30 bg-gray-50 hover:opacity-60"
                  >
                    <span className="text-sm font-bold w-6 h-6 flex items-center justify-center text-gray-400">
                      {day.getDate()}
                    </span>
                  </button>
                );
              }

              const daySlots = [...(slotsByDate[dateStr] ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time));
              const recurring = [...weeklySlots.filter((s) => s.day_of_week === day.getDay())].sort((a, b) => a.start_time.localeCompare(b.start_time));
              const items = buildDayItems(daySlots, recurring, bookingsByDate[dateStr] ?? [], pendingByDate[dateStr] ?? []);
              const past = isPast(day);
              const today = isToday(day);

              const colorClass = past
                ? "bg-gray-50 hover:bg-gray-100 opacity-40"
                : items.length === 0
                  ? "bg-gray-100 hover:bg-gray-200"
                  : "bg-white hover:bg-gray-50";
              // Quick-glance chips: one per slot / booking / stray request,
              // colored by status (blue free, orange pending, green booked).
              const visible = items.slice(0, 3);
              const extra = items.length - visible.length;

              return (
                <button
                  key={dateStr}
                  data-date={dateStr}
                  onClick={() => openPanel(day)}
                  className={`flex flex-col items-center px-0.5 py-1.5 min-h-0 overflow-hidden rounded-xl shadow-md transition-colors ${today ? "ring-2 ring-black" : ""} ${colorClass}`}
                >
                  <span className="text-sm font-bold w-6 h-6 flex items-center justify-center text-gray-900">
                    {day.getDate()}
                  </span>
                  {visible.length > 0 && (
                    <div className="mt-0.5 flex flex-col items-center gap-0.5 leading-tight">
                      {visible.map((item, i) => (
                        <span
                          key={i}
                          className={`text-[10px] font-semibold tabular-nums px-1 rounded whitespace-nowrap ${CHIP_CLASS[itemState(item)]}`}
                        >
                          {chipLabel(item)}
                        </span>
                      ))}
                      {extra > 0 && <span className="text-[10px] font-semibold text-gray-500">+{extra}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div className="shrink-0 flex items-center justify-center gap-x-3 gap-y-1 px-2 py-1.5 flex-wrap text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-300" /> {t("avail_legend_booked")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-300" /> {t("avail_legend_pending")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-200" /> {t("avail_legend_available")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300" /> {t("avail_legend_none")}
        </span>
      </div>
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
              {/* One-line summary of the day: free hours, pending, booked */}
              <DaySummary items={panelItems} t={t} />

              {/* Add slot — only for non-past days, revealed by the + button and
                  shown at the top so it's the first thing the cleaner sees */}
              {!panel.past && addOpen && (
                <div className="px-6 pt-5 pb-5 border-b border-gray-100">
                  <p className="text-base font-semibold text-gray-700 mb-3">{t("avail_add_section")}</p>
                  <form onSubmit={handleAdd} className="space-y-4">
                    <SlotFields
                      startTime={startTime} endTime={endTime} note={note}
                      setStartTime={setStartTime} setEndTime={setEndTime} setNote={setNote} t={t}
                    />
                    {endTime > startTime && minutesOf(endTime) - minutesOf(startTime) <= 60 && (
                      <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ⚠ {t("avail_short_warning")}
                      </p>
                    )}
                    {error && !editingId && <p className="text-base text-red-600">{error}</p>}
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

              {/* The day as one timeline sorted by start time. Extra bottom
                  padding so the floating + button never overlaps the last item. */}
              <div className="px-6 pt-4 pb-24 space-y-3">
                {panelItems.length === 0 ? (
                  <p className="text-base text-gray-400 italic text-center py-4">
                    {panel.past ? t("avail_no_hours_past") : t("avail_no_slots_yet")}
                  </p>
                ) : (
                  panelItems.map((item) => {
                    // ---- accepted clean (green) --------------------------------
                    if (item.kind === "booked") {
                      const b = item.booking;
                      const name = b.profiles?.full_name ?? t("req_customer");
                      return (
                        <div key={`b-${b.id}`} className="relative bg-green-100 rounded-xl px-4 py-3 pe-14">
                          {b.customer_id && (
                            <Link
                              href={`/cleaner/chat/${b.customer_id}`}
                              aria-label={t("avail_chat_with", { name })}
                              title={t("avail_chat_with", { name })}
                              className="absolute top-2.5 end-2.5 w-9 h-9 rounded-full bg-white/70 text-green-800 hover:bg-white flex items-center justify-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-9 6 3.5-3.5H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
                              </svg>
                            </Link>
                          )}
                          <p className="text-lg font-semibold text-green-800">
                            {b.scheduled_start.slice(0, 5)} · {t("avail_about_hours", { n: b.duration_hours })}
                          </p>
                          <p className="text-base text-green-800">
                            {t("avail_with")}{" "}
                            {b.customer_id ? (
                              <Link href={`/cleaner/customers/${b.customer_id}`} className="font-semibold underline hover:text-green-600">
                                {name}
                              </Link>
                            ) : (
                              <span className="font-semibold">{name}</span>
                            )}
                          </p>
                          {b.address && <p className="text-sm text-green-700 mt-0.5">{b.address}</p>}
                        </div>
                      );
                    }

                    // ---- request that sits outside every slot (orange) ---------
                    if (item.kind === "request") {
                      const b = item.booking;
                      return (
                        <Link
                          key={`r-${b.id}`}
                          href="/cleaner/requests"
                          className="block bg-orange-50 border-2 border-dashed border-orange-300 rounded-xl px-4 py-3 hover:bg-orange-100"
                        >
                          <p className="text-lg font-semibold text-orange-700">
                            {b.scheduled_start.slice(0, 5)} · {t("avail_about_hours", { n: b.duration_hours })}
                          </p>
                          <p className="text-sm text-orange-700">
                            {b.profiles?.full_name ?? t("req_customer")} · {t("avail_outside")} ›
                          </p>
                        </Link>
                      );
                    }

                    // ---- availability slot: weekly (read-only) or date slot ----
                    const state = itemState(item);
                    const tone =
                      state === "pending"
                        ? { card: "bg-orange-100", text: "text-orange-800", sub: "text-orange-700" }
                        : item.kind === "weekly"
                          ? { card: "bg-indigo-100", text: "text-indigo-700", sub: "text-indigo-500" }
                          : { card: "bg-blue-100", text: "text-blue-800", sub: "text-blue-700" };
                    const requests = (
                      <>
                        {item.requests.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {item.requests.map((r) => (
                              <li key={r.id}>
                                <Link
                                  href="/cleaner/requests"
                                  className={`text-sm font-medium underline ${tone.text} hover:opacity-70`}
                                >
                                  {r.profiles?.full_name ?? t("req_customer")} · {r.scheduled_start.slice(0, 5)} ·{" "}
                                  {t("avail_about_hours", { n: r.duration_hours })} ›
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    );

                    if (item.kind === "weekly") {
                      return (
                        <div key={`w-${item.slot.id}`} className={`${tone.card} rounded-xl px-4 py-3`}>
                          <p className={`text-xs font-medium mb-0.5 ${tone.sub}`}>{t("avail_recurring_label")}</p>
                          <p className={`text-lg font-semibold ${tone.text}`}>
                            {formatRange(item.slot.start_time, item.slot.end_time)}
                          </p>
                          {requests}
                        </div>
                      );
                    }

                    const slot = item.slot;
                    if (editingId === slot.id) {
                      return (
                        <div key={`s-${slot.id}`} className="bg-white border-2 border-blue-300 rounded-xl p-4 space-y-4">
                          <p className="text-base font-semibold text-gray-700">{t("avail_edit_slot")}</p>
                          <SlotFields
                            startTime={editStart} endTime={editEnd} note={editNote}
                            setStartTime={setEditStart} setEndTime={setEditEnd} setNote={setEditNote} t={t}
                          />
                          {editImpact > 0 && !confirmDelete && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              ⚠ {t("avail_change_warn", { n: editImpact })}
                            </p>
                          )}
                          {confirmDelete && deleteImpact > 0 && (
                            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                              ⚠ {t("avail_delete_warn", { n: deleteImpact })}
                            </p>
                          )}
                          {error && editingId === slot.id && <p className="text-base text-red-600">{error}</p>}
                          {confirmDelete ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleDelete(slot.id)}
                                disabled={editSaving}
                                className="flex-1 bg-red-600 text-white rounded-xl py-3 font-semibold hover:bg-red-700 disabled:opacity-50"
                              >
                                {t("avail_delete_confirm")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-200"
                              >
                                {t("avail_keep")}
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(slot.id)}
                                  disabled={editSaving || editEnd <= editStart}
                                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {editSaving ? t("avail_saving") : t("avail_save")}
                                </button>
                                <button
                                  type="button"
                                  onClick={stopEdit}
                                  className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-200"
                                >
                                  {t("avail_cancel")}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="block mx-auto text-sm text-gray-500 underline hover:text-red-600"
                              >
                                {t("avail_delete_slot")}
                              </button>
                            </>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={`s-${slot.id}`} className={`${tone.card} rounded-xl px-4 py-3`}>
                        {panel.past ? (
                          <div>
                            <p className={`text-lg font-semibold ${tone.text}`}>{formatRange(slot.start_time, slot.end_time)}</p>
                            {slot.note && <p className={`text-sm mt-0.5 ${tone.sub}`}>{slot.note}</p>}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(slot)}
                            aria-label={`${t("avail_edit_slot")}: ${formatRange(slot.start_time, slot.end_time)}`}
                            className="w-full flex items-start justify-between gap-3 text-start"
                          >
                            <span className="min-w-0">
                              <span className={`block text-lg font-semibold ${tone.text}`}>{formatRange(slot.start_time, slot.end_time)}</span>
                              {slot.note && <span className={`block text-sm mt-0.5 ${tone.sub}`}>{slot.note}</span>}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 shrink-0 mt-1 ${tone.sub}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                        )}
                        {requests}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
