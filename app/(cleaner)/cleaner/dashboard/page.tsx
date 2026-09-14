import { createClient, getCurrentUser, getCleanerStatus } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import RealtimeBookings from "./RealtimeBookings";
import DashboardGreeting from "./DashboardGreeting";
import DashboardLists from "./DashboardLists";
import UpdatesSection from "./UpdatesSection";
import type { BookingWithCustomer } from "@/types/database";
import type { Lang } from "@/lib/lang";
import { t } from "@/lib/lang";
import type { CustomerHomeInfo } from "@/lib/bookingSummary";

export default async function CleanerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;

  const supabase = await createClient();
  // Service-role client for the booking queries below: the embedded customer
  // profile (notably `phone`) is hidden from the cleaner by the "users manage
  // own profile" RLS policy. Both queries still filter `cleaner_id = user.id`,
  // so results stay scoped to this cleaner. (Mirrors /cleaner/requests.)
  const admin = createAdminClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const startDateTime = (b: BookingWithCustomer) =>
    new Date(`${b.scheduled_date}T${b.scheduled_start}`);

  const [cleanerStatus, { data: profile }, { data: cleanerRow }, { count: pendingCount }, { data: upcomingRaw }, { data: pastRaw }, { data: cancelledRaw }] =
    await Promise.all([
      getCleanerStatus(user.id),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single<{ full_name: string | null }>(),
      // This cleaner's own rate, for the "Estimated total" row on the shared
      // BookingRequestSummary (see lib/bookingSummary.ts) — same value for
      // every clean shown on this page, so fetched once.
      admin.from("cleaners").select("hourly_rate").eq("id", user.id).single<{ hourly_rate: number | null }>(),
      // Same query the layout already runs for the nav's Requests badge —
      // drives the dashboard's own bell/dot (see DashboardGreeting.tsx).
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("cleaner_id", user.id)
        .eq("status", "pending")
        .gt("response_deadline", now.toISOString()),
      // Accepted cleans from today onward; today's already-started ones are
      // dropped below so only genuinely upcoming cleans remain.
      admin
        .from("bookings")
        .select("*, profiles!customer_id(full_name, phone, avatar_url)")
        .eq("cleaner_id", user.id)
        .eq("status", "accepted")
        .gte("scheduled_date", todayStr)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_start", { ascending: true })
        .limit(20)
        .returns<BookingWithCustomer[]>(),
      // Accepted or completed cleans up to today; today's not-yet-started ones
      // are dropped below so only cleans whose start time has passed remain.
      admin
        .from("bookings")
        .select("*, profiles!customer_id(full_name, phone, avatar_url)")
        .eq("cleaner_id", user.id)
        .in("status", ["accepted", "completed"])
        .lte("scheduled_date", todayStr)
        .order("scheduled_date", { ascending: false })
        .order("scheduled_start", { ascending: false })
        .limit(40)
        .returns<BookingWithCustomer[]>(),
      // Cancellations the cleaner hasn't dismissed yet — surfaced as "Updates".
      // cancelClean sets cleaner_ack_cancelled on the cleaner's own cancels, so
      // only cancellations she didn't initiate (customer cancel / sibling
      // auto-cancel) land here.
      admin
        .from("bookings")
        .select("*, profiles!customer_id(full_name, phone, avatar_url)")
        .eq("cleaner_id", user.id)
        .eq("status", "cancelled")
        .eq("cleaner_ack_cancelled", false)
        .order("scheduled_date", { ascending: false })
        .order("scheduled_start", { ascending: false })
        .limit(20)
        .returns<BookingWithCustomer[]>(),
    ]);

  const hourlyRate = cleanerRow?.hourly_rate ?? null;

  const upcomingBookings = (upcomingRaw ?? [])
    .filter((b) => startDateTime(b) >= now)
    .slice(0, 6);

  // Whole calendar days from today to the clean's date (0 = today, 1 = tomorrow).
  // Computed server-side so the card's "in N days" label can't hydrate-mismatch.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntilClean = (b: BookingWithCustomer) => {
    const [yy, mm, dd] = b.scheduled_date.split("-").map(Number);
    const cleanDay = new Date(yy, mm - 1, dd);
    return Math.round((cleanDay.getTime() - startOfToday.getTime()) / 86_400_000);
  };
  // The cleaner's own ratings, keyed by the customer they rated — one editable
  // rating per customer, so every completed clean with that customer seeds the
  // same score in the detail modal.
  const { data: myRatings } = await admin
    .from("ratings")
    .select("ratee_id, score, review_text")
    .eq("rater_id", user.id);
  const ratingMap = Object.fromEntries((myRatings ?? []).map((r) => [r.ratee_id, r.score]));
  const reviewMap = Object.fromEntries((myRatings ?? []).map((r) => [r.ratee_id, r.review_text]));

  const pastBookings = (pastRaw ?? [])
    .filter((b) => startDateTime(b) < now)
    .slice(0, 20)
    .map((b) => ({
      ...b,
      my_rating: ratingMap[b.customer_id] ?? null,
      my_review_text: reviewMap[b.customer_id] ?? null,
    }));

  // Each requesting host's live home/pet snapshot, for the shared
  // BookingRequestSummary's "Your home"/"Pets" rows (see lib/bookingSummary.ts)
  // — batch-fetched once for every customer shown on this page, same pattern
  // as /cleaner/requests.
  const homeCustomerIds = Array.from(new Set([...upcomingBookings, ...pastBookings].map((b) => b.customer_id)));
  const { data: homeRows } = homeCustomerIds.length
    ? await admin
        .from("customers")
        .select("id, dwelling_type, bedrooms, num_rooms, bathrooms, pet_types, num_pets")
        .in("id", homeCustomerIds)
        .returns<(CustomerHomeInfo & { id: string })[]>()
    : { data: [] as (CustomerHomeInfo & { id: string })[] };
  const homeInfoMap = new Map((homeRows ?? []).map((r) => [r.id, r]));

  const upcomingWithHome = upcomingBookings.map((b) => ({
    ...b,
    home_info: homeInfoMap.get(b.customer_id) ?? null,
    daysUntil: daysUntilClean(b),
  }));
  const pastWithHome = pastBookings.map((b) => ({ ...b, home_info: homeInfoMap.get(b.customer_id) ?? null }));

  if (!cleanerStatus || cleanerStatus === "pending") {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3">⏳</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">{t(lang, "dash_under_review_title")}</h2>
          <p className="text-base text-gray-500">{t(lang, "dash_under_review_body")}</p>
        </div>
      </div>
    );
  }

  if (cleanerStatus === "rejected") {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3">❌</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">{t(lang, "dash_rejected_title")}</h2>
          <p className="text-base text-gray-500">{t(lang, "dash_rejected_body")}</p>
        </div>
      </div>
    );
  }

  if (cleanerStatus === "suspended") {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3">🚫</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">{t(lang, "dash_suspended_title")}</h2>
          <p className="text-base text-gray-500">{t(lang, "dash_suspended_body")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <RealtimeBookings cleanerId={user.id} />
      <DashboardGreeting name={profile?.full_name ?? user.email ?? ""} pendingCount={pendingCount ?? 0} />

      <UpdatesSection bookings={cancelledRaw ?? []} />

      <DashboardLists upcoming={upcomingWithHome} past={pastWithHome} hourlyRate={hourlyRate} />
    </div>
  );
}
