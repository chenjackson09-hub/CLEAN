import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify, profileNames } from "@/lib/notifications";
import { shortName } from "@/lib/chatFormat";
import { emailRequestAnswered } from "@/lib/appEmails";

type Expiring = { id: string; customer_id: string; cleaner_id: string; scheduled_date: string; scheduled_start: string | null };

// Marks pending requests whose 24h response deadline has passed as "declined", so they stop
// showing as actionable across the app, and tells each host (bell + email). For one cleaner
// (the lazy sweep on their page loads) or for everyone (the scheduled housekeeping job).
// Each request is closed with its own guarded update ("only if it is still pending"), so when
// two sweeps overlap exactly one of them closes it — and only that one tells the host.
// Returns how many it closed. Service-role client; idempotent.
export async function sweepExpiredRequests(admin: SupabaseClient, opts: { cleanerId?: string } = {}): Promise<number> {
  const now = new Date().toISOString();
  let query = admin
    .from("bookings")
    .select("id, customer_id, cleaner_id, scheduled_date, scheduled_start")
    .eq("status", "pending")
    .lt("response_deadline", now);
  if (opts.cleanerId) query = query.eq("cleaner_id", opts.cleanerId);
  const { data: expiring } = await query;
  if (!expiring || expiring.length === 0) return 0;

  const closed: Expiring[] = [];
  for (const b of expiring as Expiring[]) {
    const { data: won } = await admin
      .from("bookings")
      .update({ status: "declined", responded_at: now })
      .eq("id", b.id)
      .eq("status", "pending")
      .select("id");
    if (won && won.length > 0) closed.push(b);
  }
  if (closed.length === 0) return 0;

  const names = await profileNames(admin, closed.map((b) => b.cleaner_id));
  await notify(
    admin,
    closed.map((b) => ({
      userId: b.customer_id,
      kind: "request_expired" as const,
      actorId: b.cleaner_id,
      bookingId: b.id,
      data: { name: shortName(names.get(b.cleaner_id) ?? ""), date: b.scheduled_date },
      href: "/bookings",
      once: true,
    })),
  );
  // ...and by email (best-effort), since a host waiting for an answer may not open the app.
  for (const b of closed) {
    await emailRequestAnswered(admin, {
      kind: "expired",
      bookingId: b.id,
      hostId: b.customer_id,
      cleanerId: b.cleaner_id,
      date: b.scheduled_date,
      time: b.scheduled_start,
    });
  }
  return closed.length;
}

// The lazy sweep for one cleaner (run on their page loads, as a backstop to the scheduled job).
// Never throws.
export async function declineExpiredRequests(cleanerId: string) {
  try {
    await sweepExpiredRequests(createAdminClient(), { cleanerId });
  } catch (e) {
    console.error("declineExpiredRequests failed", e);
  }
}
