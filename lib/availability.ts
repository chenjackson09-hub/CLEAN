import type { SupabaseClient } from "@supabase/supabase-js";

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

// Adds a freed time range back into the cleaner's specific-date availability,
// merging it with any overlapping or exactly-adjacent slots so the day's free
// time stays consolidated (e.g. existing 10:00–12:00 + freed 08:00–10:00 →
// 08:00–12:00). This is the inverse of carveAvailability: call it when an
// accepted booking is cancelled so the carved-out slot reopens.
//
// Pass a service-role client when calling from a context that doesn't own the
// availability rows (e.g. the customer-side cancel) — RLS only lets the cleaner
// write their own cleaner_availability.
export async function restoreAvailability(
  client: SupabaseClient,
  cleanerId: string,
  date: string,
  freedStart: number,
  freedEnd: number,
) {
  const { data: slots } = await client
    .from("cleaner_availability")
    .select("id, start_time, end_time")
    .eq("cleaner_id", cleanerId)
    .eq("date", date);

  let start = freedStart;
  let end = freedEnd;
  const toDelete: string[] = [];

  for (const slot of slots ?? []) {
    const s = timeToMinutes(slot.start_time);
    const e = timeToMinutes(slot.end_time);
    // Merge slots that overlap or sit exactly against the freed range.
    if (s <= end && e >= start) {
      start = Math.min(start, s);
      end = Math.max(end, e);
      toDelete.push(slot.id);
    }
  }

  if (toDelete.length > 0) {
    await client.from("cleaner_availability").delete().in("id", toDelete);
  }

  await client.from("cleaner_availability").insert({
    cleaner_id: cleanerId,
    date,
    start_time: minutesToTime(start),
    end_time: minutesToTime(end),
  });
}

export type ConsumedSlot = { id: string; start_time: string; end_time: string };

// The cleaner's specific-date slot that contains a booking's start time (null
// when the booking sits in no date slot, e.g. only a recurring weekly one).
export async function findSlotForBooking(
  client: SupabaseClient,
  cleanerId: string,
  date: string,
  bookedStart: number,
): Promise<ConsumedSlot | null> {
  const { data: slots } = await client
    .from("cleaner_availability")
    .select("id, start_time, end_time")
    .eq("cleaner_id", cleanerId)
    .eq("date", date);
  return (
    (slots ?? []).find(
      (s) => timeToMinutes(s.start_time) <= bookedStart && bookedStart < timeToMinutes(s.end_time),
    ) ?? null
  );
}

// Puts a consumed slot back exactly as it was (merging with any adjacent slot,
// like restoreAvailability does).
export async function restoreSlot(
  client: SupabaseClient,
  cleanerId: string,
  date: string,
  slotStart: string,
  slotEnd: string,
) {
  await restoreAvailability(client, cleanerId, date, timeToMinutes(slotStart), timeToMinutes(slotEnd));
}

// Pure: `range` minus every blocker, as the pieces that remain (minutes since
// midnight, ascending). Pieces shorter than `minLength` are dropped.
export function subtractRanges(
  range: [number, number],
  blockers: [number, number][],
  minLength = 15,
): [number, number][] {
  let pieces: [number, number][] = [range];
  for (const [bs, be] of blockers) {
    pieces = pieces.flatMap(([ps, pe]): [number, number][] => {
      if (be <= ps || bs >= pe) return [[ps, pe]];
      const out: [number, number][] = [];
      if (bs > ps) out.push([ps, bs]);
      if (be < pe) out.push([be, pe]);
      return out;
    });
  }
  return pieces.filter(([a, b]) => b - a >= minLength).sort((a, b) => a[0] - b[0]);
}

// Releases the time a cancelled booking was holding: puts back the slot it
// consumed (or, for bookings accepted before slots were recorded, just its own
// window) — never more than the cleaner originally marked. Any OTHER accepted
// booking the cleaner has since gotten that day keeps its time: it is cut out of
// what is released, so a cancel can never reopen time that is booked.
export async function releaseBookingTime(
  client: SupabaseClient,
  booking: {
    id: string;
    cleaner_id: string;
    scheduled_date: string;
    scheduled_start: string;
    duration_hours: number;
    slot_start?: string | null;
    slot_end?: string | null;
  },
) {
  const start = booking.slot_start && booking.slot_end ? timeToMinutes(booking.slot_start) : timeToMinutes(booking.scheduled_start);
  const end =
    booking.slot_start && booking.slot_end
      ? timeToMinutes(booking.slot_end)
      : timeToMinutes(booking.scheduled_start) + booking.duration_hours * 60;

  const { data: others } = await client
    .from("bookings")
    .select("scheduled_start, duration_hours, slot_start, slot_end")
    .eq("cleaner_id", booking.cleaner_id)
    .eq("scheduled_date", booking.scheduled_date)
    .eq("status", "accepted")
    .neq("id", booking.id);

  const blockers: [number, number][] = (others ?? []).map((o) => {
    const hasSlot = o.slot_start && o.slot_end;
    const s = timeToMinutes((hasSlot ? o.slot_start : o.scheduled_start) as string);
    const e = hasSlot ? timeToMinutes(o.slot_end as string) : s + Number(o.duration_hours) * 60;
    return [s, e];
  });

  for (const [ps, pe] of subtractRanges([start, end], blockers)) {
    await restoreAvailability(client, booking.cleaner_id, booking.scheduled_date, ps, pe);
  }
}
