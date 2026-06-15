"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { geocodeAddress } from "@/lib/geocode";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white inline-block me-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function CustomerOnboardingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("pending_signup");
    if (!raw) {
      router.replace("/register");
      return;
    }
    setCreds(JSON.parse(raw));
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!creds) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const supabase = createClient();

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: creds.email,
      password: creds.password,
    });
    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    const user = signUpData.user;
    if (!user) {
      setError(t("auth.registerCustomer.signUpFailed"));
      setLoading(false);
      return;
    }

    const fullName = formData.get("full_name") as string;
    const phone = formData.get("phone") as string;
    const bio = formData.get("bio") as string;
    const preferredServiceType = formData.get("preferred_service_type") as string;
    const address = formData.get("address") as string;

    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: user.id,
      role: "customer",
      full_name: fullName,
      phone,
    });
    if (profileErr) {
      setError(profileErr.message);
      setLoading(false);
      return;
    }

    const location = await geocodeAddress(address);

    const { error: customerErr } = await supabase.from("customers").insert({
      id: user.id,
      bio,
      address,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      preferred_service_type: preferredServiceType,
    });
    if (customerErr) {
      setError(customerErr.message);
      setLoading(false);
      return;
    }

    localStorage.removeItem("pending_signup");
    router.push("/browse");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm font-medium text-gray-600">{t("auth.registerCustomer.settingUp")}</p>
        </div>
      )}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-8">
        <div className="flex justify-between items-center mb-5">
          <button
            type="button"
            onClick={() => router.push("/register")}
            disabled={loading}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("auth.registerCustomer.goBack")}
          </button>
          <LanguageToggle />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("auth.registerCustomer.title")}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {t("auth.registerCustomer.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.fullName")}</label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.phone")}</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.bio")}</label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder={t("auth.registerCustomer.bioPlaceholder")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label htmlFor="preferred_service_type" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.preferredServiceType")}</label>
            <select
              id="preferred_service_type"
              name="preferred_service_type"
              required
              defaultValue=""
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>{t("auth.registerCustomer.selectOption")}</option>
              <option value="residential">{t("common.residential")}</option>
              <option value="commercial">{t("common.commercial")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.address")}</label>
            <input
              type="text"
              id="address"
              name="address"
              required
              placeholder={t("auth.registerCustomer.addressPlaceholder")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">{t("auth.registerCustomer.addressHint")}</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !creds}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {loading ? <><Spinner />{t("auth.registerCustomer.finishing")}</> : t("auth.registerCustomer.finish")}
          </button>
        </form>
      </div>
    </div>
  );
}
