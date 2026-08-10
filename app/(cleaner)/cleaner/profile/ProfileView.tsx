"use client";

import { useLang } from "@/context/LangContext";
import { StarRatingDisplay } from "@/components/StarRating";
import { computeProfileMissing, profileCompletionPct } from "@/lib/profileCompleteness";
import type { Profile, Cleaner } from "@/types/database";

interface Props {
  profile: Profile | null;
  cleaner: Cleaner | null;
  onEdit: () => void;
}

function ageFromBirthdate(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const mDiff = today.getMonth() - birth.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function ProfileView({ profile, cleaner, onEdit }: Props) {
  const { t } = useLang();
  const age = ageFromBirthdate(cleaner?.birthdate ?? null);
  const missing = computeProfileMissing(t, cleaner, profile);
  const pct = profileCompletionPct(missing.length);

  return (
    <div className="bg-white rounded-3xl shadow-md p-6">
      {pct < 100 && (
        <button type="button" onClick={onEdit} className="w-full text-start mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-semibold text-gray-600">{t("prof_pct_complete").replace("{pct}", String(pct))}</span>
          </div>
          {missing.length > 0 && (
            <p className="text-sm text-gray-400 mt-1.5">{t("prof_still_missing").replace("{list}", missing.join(", "))}</p>
          )}
        </button>
      )}

      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ✏️ {t("prof_edit")}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">👤</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900 truncate">
              {profile?.full_name || "—"}
              {age !== null ? `, ${age}` : ""}
            </p>
            <div className="mt-1">
              <StarRatingDisplay value={cleaner?.rating_avg} count={cleaner?.rating_count} emptyLabel={t("prof_no_ratings")} />
            </div>
            <p className="text-sm text-gray-500 mt-1 truncate">{cleaner?.address || "—"}</p>
          </div>
        </div>
        <div className="bg-blue-600 text-white rounded-2xl px-4 py-2.5 text-center shrink-0">
          <p className="text-xl font-semibold leading-none">₪{cleaner?.hourly_rate ?? 0}</p>
          <p className="text-[10px] font-medium mt-1 leading-none">/hr</p>
        </div>
      </div>

      {cleaner?.bio && <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">{cleaner.bio}</p>}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-gray-400">{t("prof_min_job")}</p>
          <p className="text-base font-semibold text-gray-900 mt-0.5">{cleaner?.min_hours ?? 0} hrs</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-gray-400">{t("prof_houses_cleaned")}</p>
          <p className="text-base font-semibold text-gray-900 mt-0.5">{cleaner?.cleans_completed ?? 0}</p>
        </div>
        {cleaner?.has_car && cleaner?.gas_return_enabled && (
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 col-span-2">
            <p className="text-xs text-gray-400">{t("prof_gas_return_stat")}</p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">
              ₪{Number(cleaner.gas_return_rate ?? 1).toFixed(2)} <b>{t("prof_per_km")}</b>
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-1.5">{t("prof_services_label")}</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {cleaner?.cleaning_categories && cleaner.cleaning_categories.length > 0 ? (
          cleaner.cleaning_categories.map((s) => (
            <span key={s} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
              {s === "Other" ? cleaner.cleaning_category_other || "Other" : s}
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-400">{t("prof_none_selected")}</span>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-1.5">{t("prof_looking_for_label")}</p>
      <div className="flex flex-wrap gap-1.5">
        {cleaner?.match_preferences && cleaner.match_preferences.length > 0 ? (
          cleaner.match_preferences.map((pref) => (
            <span key={pref} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
              {pref === "other"
                ? cleaner.match_preference_other || t("prof_match_other")
                : pref === "recurring"
                  ? t("prof_match_recurring")
                  : t("prof_match_occasional")}
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-400">{t("prof_not_set")}</span>
        )}
      </div>
    </div>
  );
}
