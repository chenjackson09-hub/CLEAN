"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateCleanerProfile } from "../../actions";
import { normalizeImageToJpeg } from "@/lib/image/normalizeImage";
import { useLang } from "@/context/LangContext";
import { WORK_AREAS } from "@/lib/workAreas";
import type { Profile, Cleaner } from "@/types/database";

function birthdateParts(birthdate: string | null | undefined) {
  if (!birthdate) return { d: "", m: "", y: "" };
  const [y, m, d] = birthdate.split("-");
  return { d: String(Number(d)), m: String(Number(m)), y };
}

interface Props {
  profile: Profile | null;
  cleaner: Cleaner | null;
  onSaved?: () => void;
}

export default function ProfileForm({ profile, cleaner, onSaved }: Props) {
  const { t } = useLang();
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const birth = birthdateParts(cleaner?.birthdate);
  const [freqType, setFreqType] = useState<"num" | "monthly" | "other">(
    cleaner?.weekly_clean_target ? "num" : cleaner?.weekly_clean_other === "monthly" ? "monthly" : cleaner?.weekly_clean_other ? "other" : "num"
  );
  const [hasCar, setHasCar] = useState(cleaner?.has_car === true ? "yes" : cleaner?.has_car === false ? "no" : "");
  const [gasEnabled, setGasEnabled] = useState(cleaner?.gas_return_enabled ? "yes" : "no");
  const [matchPrefs, setMatchPrefs] = useState<string[]>(cleaner?.match_preferences ?? []);
  const [servicesOtherPicked, setServicesOtherPicked] = useState(cleaner?.cleaning_categories?.includes("Other") ?? false);
  const [cleaningCategories, setCleaningCategories] = useState<string[]>(cleaner?.cleaning_categories ?? []);
  const [workAreas, setWorkAreas] = useState<string[]>(cleaner?.work_areas ?? []);
  const [freqVal, setFreqVal] = useState<number | null>(cleaner?.weekly_clean_target ?? null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await updateCleanerProfile(formData);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: t("prof_saved") });
      // Adopt the freshly-saved (cache-busted) avatar URL and re-fetch server
      // data so the preview/edit pages no longer show the previous photo.
      if (result?.avatarUrl) setAvatarPreview(result.avatarUrl);
      router.refresh();
      onSaved?.();
    }
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-5 bg-white rounded-3xl shadow-md p-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden shrink-0">
          {avatarPreview ? (
            <Image src={avatarPreview} alt="Avatar" width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">👤</div>
          )}
        </div>
        <div>
          <label htmlFor="avatar" className="block text-base font-medium text-gray-700 mb-1">{t("prof_photo")}</label>
          <input
            id="avatar"
            type="file"
            name="avatar"
            accept="image/*"
            onChange={async (e) => {
              const input = e.target;
              const file = input.files?.[0];
              if (!file) return;
              // Convert HEIC/large phone photos to a small JPEG and write it
              // back so the form submits the converted file, not the raw HEIC.
              const normalized = await normalizeImageToJpeg(file);
              if (normalized !== file) {
                const dt = new DataTransfer();
                dt.items.add(normalized);
                input.files = dt.files;
              }
              setAvatarPreview(URL.createObjectURL(normalized));
            }}
            className="text-base text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-base file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="full_name" className="block text-base font-medium text-gray-700 mb-1">{t("prof_full_name")}</label>
          <input
            id="full_name"
            type="text"
            name="full_name"
            autoComplete="name"
            defaultValue={profile?.full_name ?? ""}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-base font-medium text-gray-700 mb-1">{t("prof_phone")}</label>
          <input
            id="phone"
            type="tel"
            name="phone"
            autoComplete="tel"
            defaultValue={profile?.phone ?? ""}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-base font-medium text-gray-700 mb-1">{t("prof_bio")}</label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={cleaner?.bio ?? ""}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="hourly_rate" className="block text-base font-medium text-gray-700 mb-1">{t("prof_hourly_rate")}</label>
          <input
            id="hourly_rate"
            type="number"
            name="hourly_rate"
            min="0"
            step="0.50"
            defaultValue={cleaner?.hourly_rate ?? ""}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="service_radius_km" className="block text-base font-medium text-gray-700 mb-1">{t("prof_service_radius")}</label>
          <input
            id="service_radius_km"
            type="number"
            name="service_radius_km"
            min="1"
            max="100"
            defaultValue={cleaner?.service_radius_km ?? 10}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="min_hours" className="block text-base font-medium text-gray-700 mb-1">{t("prof_min_hours")}</label>
          <input
            id="min_hours"
            type="number"
            name="min_hours"
            inputMode="numeric"
            min="1"
            max="24"
            defaultValue={cleaner?.min_hours ?? ""}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="max_hours" className="block text-base font-medium text-gray-700 mb-1">{t("prof_max_hours")}</label>
          <input
            id="max_hours"
            type="number"
            name="max_hours"
            inputMode="numeric"
            min="1"
            max="24"
            defaultValue={cleaner?.max_hours ?? ""}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <span className="block text-base font-medium text-gray-700 mb-2">{t("prof_service_types")}</span>
        <div className="flex gap-4">
          {(["residential", "commercial"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 text-base text-gray-700">
              <input
                type="checkbox"
                name="service_types"
                value={type}
                defaultChecked={cleaner?.service_types?.includes(type)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {type === "residential" ? t("svc_residential") : t("svc_commercial")}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-base font-medium text-gray-700 mb-1">{t("prof_address")}</label>
        <input
          id="address"
          type="text"
          name="address"
          autoComplete="street-address"
          defaultValue={cleaner?.address ?? ""}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-400 mt-1">{t("prof_address_hint")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="years_experience" className="block text-base font-medium text-gray-700 mb-1">{t("prof_experience")}</label>
          <input
            id="years_experience"
            type="number"
            name="years_experience"
            min="0"
            max="50"
            defaultValue={cleaner?.years_experience ?? 0}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="languages" className="block text-base font-medium text-gray-700 mb-1">{t("prof_languages")}</label>
          <input
            id="languages"
            type="text"
            name="languages"
            defaultValue={cleaner?.languages?.join(", ") ?? ""}
            placeholder="English, French"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="min_job_hours" className="block text-base font-medium text-gray-700 mb-1">{t("prof_min_job_length")}</label>
        <input
          id="min_job_hours"
          type="number"
          name="min_hours"
          step="0.5"
          min="1"
          defaultValue={cleaner?.min_hours ?? 3}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <span className="block text-base font-medium text-gray-700 mb-1">{t("prof_birthdate")}</span>
        <div className="flex gap-2">
          <select name="birth_d" defaultValue={birth.d} className="flex-1 border border-gray-300 rounded-xl px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{t("prof_day")}</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select name="birth_m" defaultValue={birth.m} className="flex-[1.4] border border-gray-300 rounded-xl px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{t("prof_month")}</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select name="birth_y" defaultValue={birth.y} className="flex-[1.2] border border-gray-300 rounded-xl px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{t("prof_year")}</option>
            {Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div>
        <span className="block text-base font-medium text-gray-700 mb-2">{t("prof_service_types")}</span>
        <div className="flex flex-wrap gap-2">
          {["General home cleaning","Deep cleaning","Closets","Windows","Laundry","Pesach","Move-in","Move-out","Airbnb","Organization","Newly renovated","Pet friendly","Residential cleaning","Commercial cleaning","Offices","Other"].map((cat) => (
            <label key={cat} className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer ${cleaningCategories.includes(cat) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
              <input
                type="checkbox"
                name="cleaning_categories"
                value={cat}
                checked={cleaningCategories.includes(cat)}
                onChange={(e) => {
                  setCleaningCategories((prev) => (prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]));
                  if (cat === "Other") setServicesOtherPicked(e.target.checked);
                }}
                className="sr-only"
              />
              {cat}
            </label>
          ))}
        </div>
        {servicesOtherPicked && (
          <input
            type="text"
            name="cleaning_category_other"
            defaultValue={cleaner?.cleaning_category_other ?? ""}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      <div>
        <span className="block text-base font-medium text-gray-700 mb-2">{t("prof_match_preference")}</span>
        <div className="flex flex-col gap-2">
          {([
            ["recurring", t("prof_match_recurring")],
            ["occasional", t("prof_match_occasional")],
            ["other", t("prof_match_other")],
          ] as const).map(([v, label]) => (
            <label key={v} className={`text-start px-3.5 py-2 rounded-xl border text-sm cursor-pointer ${matchPrefs.includes(v) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
              <input
                type="checkbox"
                name="match_preferences"
                value={v}
                checked={matchPrefs.includes(v)}
                onChange={() => setMatchPrefs((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        {matchPrefs.includes("other") && (
          <input
            type="text"
            name="match_preference_other"
            defaultValue={cleaner?.match_preference_other ?? ""}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      <div>
        <span className="block text-base font-medium text-gray-700 mb-2">{t("prof_work_areas")}</span>
        <div className="flex flex-wrap gap-2">
          {WORK_AREAS.map((area) => (
            <label key={area} className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer ${workAreas.includes(area) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
              <input
                type="checkbox"
                name="work_areas"
                value={area}
                checked={workAreas.includes(area)}
                onChange={() => setWorkAreas((prev) => (prev.includes(area) ? prev.filter((x) => x !== area) : [...prev, area]))}
                className="sr-only"
              />
              {area}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gray-50 p-4 space-y-4">
        <p className="text-sm font-semibold text-gray-500">{t("prof_other_details")}</p>

        <div>
          <span className="block text-base font-medium text-gray-700 mb-1">{t("prof_has_car")}</span>
          <div className="flex gap-2">
            {(["yes", "no"] as const).map((v) => (
              <label key={v} className={`flex-1 text-center py-2 rounded-xl border text-sm cursor-pointer ${hasCar === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
                <input type="radio" name="has_car" value={v} checked={hasCar === v} onChange={() => setHasCar(v)} className="sr-only" />
                {v === "yes" ? t("prof_yes") : t("prof_no")}
              </label>
            ))}
          </div>
        </div>

        {hasCar === "yes" && (
          <div>
            <span className="block text-base font-medium text-gray-700 mb-1">{t("prof_gas_returns")}</span>
            <div className="flex gap-2">
              {(["yes", "no"] as const).map((v) => (
                <label key={v} className={`flex-1 text-center py-2 rounded-xl border text-sm cursor-pointer ${gasEnabled === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
                  <input type="radio" name="gas_return_enabled" value={v} checked={gasEnabled === v} onChange={() => setGasEnabled(v)} className="sr-only" />
                  {v === "yes" ? t("prof_yes") : t("prof_no")}
                </label>
              ))}
            </div>
            {gasEnabled === "yes" && (
              <div className="flex items-center gap-2 mt-2">
                <span>₪</span>
                <input
                  type="number"
                  step="0.01"
                  name="gas_return_rate"
                  defaultValue={cleaner?.gas_return_rate ?? 1}
                  className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">{t("prof_per_km")}</span>
              </div>
            )}
          </div>
        )}

        <div>
          <span className="block text-base font-medium text-gray-700 mb-1">{t("prof_weekly_freq")}</span>
          <div className="flex gap-1.5 flex-wrap items-center">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <label key={n} className={`w-9 h-9 flex items-center justify-center rounded-full border text-sm cursor-pointer ${freqType === "num" && freqVal === n ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
                <input
                  type="radio"
                  name="freq_val"
                  value={n}
                  checked={freqType === "num" && freqVal === n}
                  onChange={() => {
                    setFreqType("num");
                    setFreqVal(n);
                  }}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
            <input type="hidden" name="freq_type" value={freqType} />
          </div>
          <div className="flex gap-2 mt-2">
            <label className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer ${freqType === "monthly" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
              <input type="radio" name="freq_type_monthly" checked={freqType === "monthly"} onChange={() => setFreqType("monthly")} className="sr-only" />
              A few times a month
            </label>
            <label className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer ${freqType === "other" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
              <input type="radio" name="freq_type_other" checked={freqType === "other"} onChange={() => setFreqType("other")} className="sr-only" />
              Other
            </label>
          </div>
          {freqType === "other" && (
            <input
              type="text"
              name="freq_other"
              defaultValue={cleaner?.weekly_clean_other ?? ""}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <p className="text-sm text-gray-400 mt-1">{t("prof_weekly_freq_hint")}</p>
        </div>
      </div>

      {message && (
        <p
          className={`text-base rounded-xl px-3 py-2 ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded-3xl px-5 py-2.5 text-base font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? t("prof_saving") : t("prof_save")}
      </button>
    </form>
  );
}
