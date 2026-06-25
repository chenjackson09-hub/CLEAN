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
