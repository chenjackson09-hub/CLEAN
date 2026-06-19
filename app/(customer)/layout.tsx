import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { signOut } from "../(auth)/actions";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import CustomerNav from "./CustomerNav";
import RealtimeCustomerBookings from "./RealtimeCustomerBookings";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()])
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "customer") redirect("/login")

  // Count bookings a cleaner accepted since the customer last opened /bookings,
  // to show a red badge on the Bookings nav item (cleared on visit).
  const seenAt = cookies().get("bookings_seen_at")?.value
  let acceptedQuery = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user.id)
    .eq("status", "accepted")
  if (seenAt) acceptedQuery = acceptedQuery.gt("responded_at", seenAt)
  const { count: acceptedCount } = await acceptedQuery

  return (
    <div className="min-h-screen bg-gray-50">
      <RealtimeCustomerBookings customerId={user.id} />
      <CustomerNav
        signOut={signOut}
        userName={profile.full_name ?? user.email ?? ""}
        acceptedCount={acceptedCount ?? 0}
      />
      <main id="main-content" tabIndex={-1} className="px-3 pb-4 pt-16 sm:px-8 sm:pb-8">{children}</main>
    </div>
  )
}
