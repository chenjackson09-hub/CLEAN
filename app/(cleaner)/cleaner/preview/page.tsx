import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import GalleryLightbox from "./GalleryLightbox";
import AvatarLightbox from "./AvatarLightbox";
import type { Profile, Cleaner, CleanerGalleryPhoto } from "@/types/database";
import type { Lang } from "@/lib/lang";
import { t } from "@/lib/lang";

export default async function PreviewPage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  if (!user) redirect("/login");

  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;

  const [{ data: profile }, { data: cleaner }, { data: galleryPhotos }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("cleaners").select("*").eq("id", user.id).single<Cleaner>(),
    supabase
      .from("cleaner_gallery")
      .select("*")
      .eq("cleaner_id", user.id)
      .order("created_at", { ascending: false })
      .returns<CleanerGalleryPhoto[]>(),
  ]);

  return (
    <div className="-mx-8 -mt-2 min-h-screen">
      {/* Edit banner */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 flex items-center justify-between">
        <p className="text-base text-yellow-800 font-medium">{t(lang, "prev_banner")}</p>
        <Link href="/cleaner/profile" className="text-base text-blue-600 hover:underline font-semibold">
          {t(lang, "prev_edit")}
        </Link>
      </div>

      {/* Avatar + name row */}
      <div className="px-6 lg:px-10 py-6">
        <div className="flex flex-col items-center text-center gap-4 lg:flex-row lg:items-center lg:text-start lg:gap-6">
          {profile?.avatar_url ? (
            <AvatarLightbox src={profile.avatar_url} name={profile.full_name ?? t(lang, "prev_no_name")} />
          ) : (
            <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-full bg-gray-100 bg-white overflow-hidden shrink-0 shadow flex shadow-md items-center justify-center text-gray-400 text-5xl">
              👤
            </div>
          )}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {profile?.full_name ?? t(lang, "prev_no_name")}
            </h1>
            {cleaner?.languages && cleaner.languages.length > 0 && (
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-2">
                {cleaner.languages.map((lang_) => (
                  <span
                    key={lang_}
                    className="bg-gray-100 text-gray-700 text-base px-3 py-1 rounded-full"
                  >
                    {lang_}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const galleryBlock = <GalleryLightbox photos={galleryPhotos ?? []} />;

        const aboutBlock = (
          <div className="space-y-4">
            {(cleaner?.years_experience != null || cleaner?.service_radius_km || cleaner?.hourly_rate) && (
              <div className="bg-gray-50 rounded-2xl bg-white p-6 flex flex-col lg:flex-row shadow-md lg:items-center gap-4 lg:gap-6">
                <button className="w-full lg:w-auto shrink-0 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors">
                  {t(lang, "prev_request")}
                </button>
                <div className="flex items-center gap-6">
                  {cleaner?.years_experience != null && (
                    <div>
                      <p className="text-sm text-gray-500">{t(lang, "prev_experience")}</p>
                      <p className="text-base font-semibold text-gray-900">
                        {cleaner.years_experience}{" "}
                        {cleaner.years_experience !== 1 ? t(lang, "prev_years") : t(lang, "prev_year")}
                      </p>
                    </div>
                  )}
                  {cleaner?.service_radius_km && (
                    <div>
                      <p className="text-sm text-gray-500">{t(lang, "prev_radius")}</p>
                      <p className="text-base font-semibold text-gray-900">{cleaner.service_radius_km} km</p>
                    </div>
                  )}
                  {cleaner?.hourly_rate && (
                    <div>
                      <p className="text-sm text-gray-500">{t(lang, "prev_rate")}</p>
                      <p className="text-base font-semibold text-gray-900">₪{cleaner.hourly_rate}/hr</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="bg-gray-50 rounded-2xl bg-white p-6 shadow-md">
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t(lang, "prev_about")}</h2>
              <p className="text-base text-gray-700 leading-relaxed">
                {cleaner?.bio ?? <span className="text-gray-400">{t(lang, "prev_no_bio")}</span>}
              </p>
            </div>
            {cleaner?.service_types && cleaner.service_types.length > 0 && (
              <div className="bg-gray-50 rounded-2xl bg-white p-6 shadow-md">
                <h2 className="text-lg font-bold text-gray-900 mb-3">{t(lang, "prev_service_types")}</h2>
                <div className="flex flex-wrap gap-2">
                  {cleaner.service_types.map((type) => (
                    <span
                      key={type}
                      className="bg-blue-50 text-blue-700 text-base font-medium px-4 py-1.5 rounded-full"
                    >
                      {type === "residential" ? t(lang, "svc_residential") : t(lang, "svc_commercial")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

        return (
          <>
            <div className="lg:hidden px-4 py-6 space-y-4">
              {aboutBlock}
              {galleryBlock}
            </div>
            <div className="hidden lg:grid px-10 py-8 grid-cols-3 gap-6">
              <div className="col-span-2 space-y-5">{aboutBlock}</div>
              <div className="space-y-5">{galleryBlock}</div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
