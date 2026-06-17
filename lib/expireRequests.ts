import { createClient } from "@/lib/supabase/server";

// Marks a cleaner's pending requests whose 24h response deadline has passed as
// "declined", so they stop showing as actionable pending across the app. Runs
// as a lazy sweep on cleaner page loads (the project has no scheduled jobs).
// Idempotent — a no-op when nothing has expired.
export async function declineExpiredRequests(cleanerId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("bookings")
    .update({ status: "declined", responded_at: now })
    .eq("cleaner_id", cleanerId)
    .eq("status", "pending")
    .lt("response_deadline", now);
}
