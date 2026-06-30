import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { CleanerProfile } from "@/app/(customer)/cleaners/[id]/CleanerProfile";
import type { Profile, Cleaner } from "@/types/database";
import type { CleanerResult } from "@/lib/types/cleaner";
import type { Lang } from "@/lib/lang";
import { t } from "@/lib/lang";

// The cleaner's preview is the customer-facing profile, one-to-one. It reuses the
// same <CleanerProfile> shell and only overrides what's preview-specific: an edit
// banner instead of the back button and a non-interactive booking form. The
// zoomable avatar + gallery are now the default in CleanerProfile, shared by both.
export default async function PreviewPage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  if (!user) redirect("/login");

  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: profile },
    { data: cleaner },
    { data: galleryRows },
    { data: weeklyAvailability },
    { data: dateAvailability },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("cleaners").select("*").eq("id", user.id).single<Cleaner>(),
    supabase
      .from("cleaner_gallery")
      .select("photo_url")
      .eq("cleaner_id", user.id)
      .order("id", { ascending: true }),
    supabase
      .from("cleaner_weekly_availability")
      .select("day_of_week, start_time, end_time")
      .eq("cleaner_id", user.id),
    supabase
      .from("cleaner_availability")
      .select("date, start_time, end_time")
      .eq("cleaner_id", user.id)
      .gte("date", today),
  ]);

  const fullName = profile?.full_name ?? t(lang, "prev_no_name");
  const gallery = (galleryRows ?? []).map((r) => r.photo_url as string);

  const cleanerResult: CleanerResult = {
    id: user.id,
    full_name: fullName,
    avatar_url: profile?.avatar_url ?? null,
    bio: cleaner?.bio ?? "",
    service_types: (cleaner?.service_types ?? []) as string[],
    hourly_rate: cleaner?.hourly_rate ?? 0,
    years_experience: cleaner?.years_experience ?? 0,
    languages: (cleaner?.languages ?? []) as string[],
    distance_km: 0,
    rating_avg: cleaner?.rating_avg ?? null,
    rating_count: cleaner?.rating_count ?? 0,
    min_hours: cleaner?.min_hours ?? null,
    max_hours: cleaner?.max_hours ?? null,
  };

  const banner = (
    <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 flex items-center justify-between">
      <p className="text-base text-yellow-800 font-medium">{t(lang, "prev_banner")}</p>
      <Link href="/cleaner/profile" className="text-base text-blue-600 hover:underline font-semibold">
        {t(lang, "prev_edit")}
      </Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <CleanerProfile
        cleaner={cleanerResult}
        gallery={gallery}
        weeklyAvailability={weeklyAvailability ?? []}
        dateAvailability={dateAvailability ?? []}
        banner={banner}
        bookingDisabled
      />
    </div>
  );
}
