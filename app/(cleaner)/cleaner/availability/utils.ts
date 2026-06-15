export const TIME_SLOTS = [
  { label: "Morning", start: "06:00", end: "12:00" },
  { label: "Noon",    start: "12:00", end: "17:00" },
  { label: "Evening", start: "17:00", end: "22:00" },
] as const;

export type SlotLabel = typeof TIME_SLOTS[number]["label"];

export function slotLabel(start: string, end: string): string {
  const s = start.slice(0, 5);
  const e = end.slice(0, 5);
  return TIME_SLOTS.find((t) => t.start === s && t.end === e)?.label ?? `${s}–${e}`;
}
