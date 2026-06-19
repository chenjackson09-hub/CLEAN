"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateCleanerProfile } from "../../actions";
import { useLang } from "@/context/LangContext";
import type { Profile, Cleaner } from "@/types/database";

interface Props {
  profile: Profile | null;
  cleaner: Cleaner | null;
}

export default function ProfileForm({ profile, cleaner }: Props) {
  const { t } = useLang();
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);

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
    }
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden shrink-0">
          {avatarPreview ? (
            <Image src={avatarPreview} alt="Avatar" width={64} height={64} priority className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">👤</div>
          )}
        </div>
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">{t("prof_photo")}</label>
          <input
            type="file"
            name="avatar"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAvatarPreview(URL.createObjectURL(file));
            }}
            className="text-base text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-base file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">{t("prof_full_name")}</label>
          <input
            type="text"
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">{t("prof_phone")}</label>
          <input
            type="tel"
            name="phone"
            defaultValue={profile?.phone ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-base font-medium text-gray-700 mb-1">{t("prof_bio")}</label>
        <textarea
          name="bio"
          rows={3}
          defaultValue={cleaner?.bio ?? ""}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">{t("prof_hourly_rate")}</label>
          <input
            type="number"
            name="hourly_rate"
            min="0"
            step="0.50"
            defaultValue={cleaner?.hourly_rate ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">{t("prof_service_radius")}</label>
          <input
            type="number"
            name="service_radius_km"
            min="1"
            max="100"
            defaultValue={cleaner?.service_radius_km ?? 10}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-base font-medium text-gray-700 mb-2">{t("prof_service_types")}</label>
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
        <label className="block text-base font-medium text-gray-700 mb-1">{t("prof_address")}</label>
        <input
          type="text"
          name="address"
          defaultValue={cleaner?.address ?? ""}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-400 mt-1">{t("prof_address_hint")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">{t("prof_experience")}</label>
          <input
            type="number"
            name="years_experience"
            min="0"
            max="50"
            defaultValue={cleaner?.years_experience ?? 0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">{t("prof_languages")}</label>
          <input
            type="text"
            name="languages"
            defaultValue={cleaner?.languages?.join(", ") ?? ""}
            placeholder="English, French"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {message && (
        <p
          className={`text-base rounded-lg px-3 py-2 ${
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
        className="bg-blue-600 text-white rounded-lg px-5 py-2.5 text-base font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? t("prof_saving") : t("prof_save")}
      </button>
    </form>
  );
}
