import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import CalendarGrid from "./CalendarGrid";
import AvailabilityHeader from "./AvailabilityHeader";
import { declineExpiredRequests } from "@/lib/expireRequests";
import type { CleanerAvailability, CleanerWeeklyAvailability, BookingWithCustomer } from "@/types/database";

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Resolve expired requests first so the calendar's pending counts match the
  // requests page (which excludes deadline-passed requests).
  await declineExpiredRequests(user.id);

  const supabase = await createClient();
  // Service-role client for the booking queries below so the embedded customer
  // profile (name) is readable — the "users manage own profile" RLS policy
  // otherwise hides it. Both queries still filter `cleaner_id = user.id`.
  const admin = createAdminClient();

  const fmtDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  // Cover the previous month through several months ahead so calendar navigation has data.
  const from = fmtDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const to = fmtDate(new Date(today.getFullYear(), today.getMonth() + 4, 0));

  const [{ data: weeklySlots }, { data: specificSlots }, { data: bookings }, { data: pendingBookings }] = await Promise.all([
    supabase
      .from("cleaner_weekly_availability")
      .select("*")
      .eq("cleaner_id", user.id)
      .order("day_of_week")
      .order("start_time")
      .returns<CleanerWeeklyAvailability[]>(),
    supabase
      .from("cleaner_availability")
      .select("*")
      .eq("cleaner_id", user.id)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("start_time")
      .returns<CleanerAvailability[]>(),
    admin
      .from("bookings")
      .select("*, profiles!customer_id(full_name, phone, avatar_url)")
      .eq("cleaner_id", user.id)
      .eq("status", "accepted")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .order("scheduled_date")
      .order("scheduled_start")
      .returns<BookingWithCustomer[]>(),
    admin
      .from("bookings")
      .select("*, profiles!customer_id(full_name, phone, avatar_url)")
      .eq("cleaner_id", user.id)
      .eq("status", "pending")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .order("scheduled_date")
      .order("scheduled_start")
      .returns<BookingWithCustomer[]>(),
  ]);

  return (
    <div className="-mt-2 -mx-4 md:mx-0 flex flex-col min-h-screen">
      <AvailabilityHeader />

      <div className="flex flex-col flex-1 w-full md:w-[45vw] md:mx-auto">
        <CalendarGrid slots={specificSlots ?? []} weeklySlots={weeklySlots ?? []} bookings={bookings ?? []} pendingBookings={pendingBookings ?? []} />
      </div>
    </div>
  );
}
