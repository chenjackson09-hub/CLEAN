"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addWeeklyAvailability, deleteWeeklyAvailability } from "../../actions";
import type { CleanerWeeklyAvailability } from "@/types/database";

const DAYS = [
  { label: "Monday",    value: 1 },
  { label: "Tuesday",   value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday",  value: 4 },
  { label: "Friday",    value: 5 },
  { label: "Saturday",  value: 6 },
  { label: "Sunday",    value: 0 },
];

import { TIME_SLOTS, SlotLabel, slotLabel } from "./utils";
export { slotLabel };

interface Props {
  slots: CleanerWeeklyAvailability[];
}

export default function AvailabilityGrid({ slots: initialSlots }: Props) {
  const router = useRouter();
  const [slots, setSlots] = useState(initialSlots);

  useEffect(() => {
    setSlots(initialSlots);
  }, [initialSlots]);
  const [modal, setModal] = useState<{ open: boolean; day: number }>({ open: false, day: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<SlotLabel>>(new Set());

  const slotsByDay = DAYS.reduce<Record<number, CleanerWeeklyAvailability[]>>((acc, { value }) => {
    acc[value] = slots.filter((s) => s.day_of_week === value);
    return acc;
  }, {});

  function openModal(day: number) {
    setError(null);
    setSelected(new Set());
    setModal({ open: true, day });
  }

  function toggleSlot(label: SlotLabel) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    for (const label of TIME_SLOTS.map((t) => t.label).filter((l) => selected.has(l) && !modalExistingLabels.has(l))) {
      const ts = TIME_SLOTS.find((t) => t.label === label)!;
      const formData = new FormData();
      formData.set("day_of_week", String(modal.day));
      formData.set("start_time", ts.start);
      formData.set("end_time", ts.end);
      const result = await addWeeklyAvailability(formData);
      if (result?.error) { setError(result.error); setLoading(false); return; }
    }
    setModal({ open: false, day: 1 });
    router.refresh();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const result = await deleteWeeklyAvailability(id);
    if (result?.error) {
      setError(result.error);
    } else {
      setSlots((prev) => prev.filter((s) => s.id !== id));
    }
  }

  const modalDayLabel = DAYS.find((d) => d.value === modal.day)?.label ?? "";
  const modalExistingLabels = new Set(
    (slotsByDay[modal.day] ?? []).map((s) => slotLabel(s.start_time, s.end_time))
  );

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {DAYS.map(({ label, value }) => (
          <div key={value} className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col min-h-[140px]">
            <div className="text-sm font-bold text-gray-700 mb-2">{label}</div>
            <div className="flex-1 space-y-1.5">
              {slotsByDay[value].map((slot) => (
                <div key={slot.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-2 py-1.5">
                  <span className="text-xs font-medium text-blue-700">
                    {slotLabel(slot.start_time, slot.end_time)}
                  </span>
                  <button
                    onClick={() => handleDelete(slot.id)}
                    className="text-red-400 hover:text-red-600 ml-1 text-base font-bold leading-none"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => openModal(value)}
              className="mt-2 w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-sm rounded-lg py-1.5 transition-colors"
            >
              + Add
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Add recurring hours</h2>
            <p className="text-sm text-gray-500 mb-6">Every {modalDayLabel}</p>
            <form onSubmit={handleAdd} className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {TIME_SLOTS.map((ts) => (
                  <button
                    key={ts.label}
                    type="button"
                    disabled={modalExistingLabels.has(ts.label)}
                    onClick={() => toggleSlot(ts.label)}
                    className={`rounded-xl border-2 py-4 text-center transition-colors ${
                      modalExistingLabels.has(ts.label)
                        ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                        : selected.has(ts.label)
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <p className="text-base font-semibold">{ts.label}</p>
                    <p className="text-xs mt-1 opacity-70">{ts.start}–{ts.end}</p>
                  </button>
                ))}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setModal({ open: false, day: 1 }); setError(null); }}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selected.size === 0}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Adding…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
