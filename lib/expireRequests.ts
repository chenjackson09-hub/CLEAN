import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify, profileNames } from "@/lib/notifications";
import { shortName } from "@/lib/chatFormat";

// Marks a cleaner's pending requests whose 24h response deadline has passed as
// "declined", so they stop showing as actionable pending across the app. Runs
// as a lazy sweep on cleaner page loads (the project has no scheduled jobs).
// Idempotent — a no-op when nothing has expired. Each host whose request just
// lapsed is told in their bell (once per booking, so concurrent sweeps can't
// double-notify).
export async function declineExpiredRequests(cleanerId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: expiring } = await supabase
    .from("bookings")
    .select("id, customer_id, scheduled_date")
    .eq("cleaner_id", cleanerId)
    .eq("status", "pending")
    .lt("response_deadline", now);

  await supabase
    .from("bookings")
    .update({ status: "declined", responded_at: now })
    .eq("cleaner_id", cleanerId)
    .eq("status", "pending")
    .lt("response_deadline", now);

  if (!expiring || expiring.length === 0) return;
  const admin = createAdminClient();
  const names = await profileNames(admin, [cleanerId]);
  await notify(
    admin,
    expiring.map((b) => ({
      userId: b.customer_id as string,
      kind: "request_expired" as const,
      actorId: cleanerId,
      bookingId: b.id as string,
      data: { name: shortName(names.get(cleanerId) ?? ""), date: b.scheduled_date as string },
      href: "/bookings",
      once: true,
    })),
  );
}
