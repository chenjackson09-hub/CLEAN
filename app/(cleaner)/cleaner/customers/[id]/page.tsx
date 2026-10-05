import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import type { Profile, Customer } from "@/types/database";
import BackLink from "./BackLink";
import HostProfileCard from "@/components/HostProfileCard";
import type { ReviewItem } from "@/components/HostProfileReviews";

export default async function CustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const fromDashboard = from === "dashboard";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Service-role client: the "users manage own profile" RLS policy hides the
  // customer's profile row from the cleaner. Authorization is still enforced
  // below — the page 404s unless this cleaner has a booking with this customer.
  const supabase = createAdminClient();

  const [{ data: profile }, { data: customer }, { data: bookings }, { data: reviewRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single<Profile>(),
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single<Customer>(),
    supabase
      .from("bookings")
      .select("id")
      .eq("cleaner_id", user.id)
      .eq("customer_id", id)
      .limit(1)
      .returns<{ id: string }[]>(),
    // "Reviews from cleaners" — every cleaner's rating of this host that
    // includes a free-text review (see migration 0028), not just this
    // cleaner's own. Uses the admin client since RLS ("Participants read
    // ratings") would otherwise hide other cleaners' rows.
    supabase
      .from("ratings")
      .select("id, score, review_text, updated_at, rater:profiles!rater_id(full_name)")
      .eq("ratee_id", id)
      .eq("ratee_role", "customer")
      .not("review_text", "is", null)
      .order("updated_at", { ascending: false })
      .returns<{ id: string; score: number; review_text: string; updated_at: string; rater: { full_name: string | null } | null }[]>(),
  ]);

  if (!profile || !bookings || bookings.length === 0) notFound();

  const reviews: ReviewItem[] = (reviewRows ?? []).map((r) => ({
    id: r.id,
    score: r.score,
    reviewText: r.review_text,
    reviewerName: r.rater?.full_name ?? "A cleaner",
  }));

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      <BackLink fromDashboard={fromDashboard} />

      <HostProfileCard
        fullName={profile.full_name ?? "Customer"}
        avatarUrl={profile.avatar_url}
        customer={customer}
        reviews={reviews}
      />
    </div>
  );
}
