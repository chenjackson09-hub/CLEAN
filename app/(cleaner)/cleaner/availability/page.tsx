import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import CalendarGrid from "./CalendarGrid";
import type { CleanerAvailability, CleanerWeeklyAvailability, Booking } from "@/types/database";
import type { Lang } from "@/lib/lang";
import { t } from "@/lib/lang";

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;

  const supabase = await createClient();

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
    supabase
      .from("bookings")
      .select("*")
      .eq("cleaner_id", user.id)
      .eq("status", "accepted")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .order("scheduled_date")
      .order("scheduled_start")
      .returns<Booking[]>(),
    supabase
      .from("bookings")
      .select("*")
      .eq("cleaner_id", user.id)
      .eq("status", "pending")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .order("scheduled_date")
      .order("scheduled_start")
      .returns<Booking[]>(),
  ]);

  return (
    <div className="-mt-2 -mx-4 md:mx-0 flex flex-col min-h-screen">
      <div className="px-6 pt-6 pb-3 border-b border-gray-100 w-full md:w-[45vw] md:mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t(lang, "avail_title")}</h1>
        <p className="text-base text-gray-500">{t(lang, "avail_subtitle")}</p>
      </div>

      <div className="flex flex-col flex-1 w-full md:w-[45vw] md:mx-auto">
        <CalendarGrid slots={specificSlots ?? []} weeklySlots={weeklySlots ?? []} bookings={bookings ?? []} pendingBookings={pendingBookings ?? []} />
      </div>
    </div>
  );
}
