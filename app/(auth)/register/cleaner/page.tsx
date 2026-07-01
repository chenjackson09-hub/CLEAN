"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";

const LANGUAGE_OPTIONS = ["EN", "HE", "AR", "RU"]

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white inline-block me-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function CleanerOnboardingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("pending_signup");
    if (!raw) {
      router.replace("/register");
      return;
    }
    setCreds(JSON.parse(raw));
  }, [router]);

  function toggleLanguage(lang: string) {
    setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!creds) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const supabase = createClient();

    // Pass the role so the `handle_new_user` DB trigger creates the correct
    // role-specific rows (profiles + cleaners + cleaner_applications) instead of
    // defaulting to a customer. The upserts below fill in the cleaner details.
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: creds.email,
      password: creds.password,
      options: { data: { role: "cleaner" } },
    });
    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    const user = signUpData.user;
    if (!user) {
      setError(t("auth.registerCleaner.signUpFailed"));
      setLoading(false);
      return;
    }

    const fullName = formData.get("full_name") as string;
    const phone = formData.get("phone") as string;
    const bio = formData.get("bio") as string;
    const serviceType = formData.get("service_type") as string;
    const hourlyRate = Number(formData.get("hourly_rate"));
    const yearsExperience = Number(formData.get("years_experience"));
    const address = formData.get("address") as string;

    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: user.id,
      role: "cleaner",
      full_name: fullName,
      phone,
    });
    if (profileErr) {
      setError(profileErr.message);
      setLoading(false);
      return;
    }

    const serviceTypes = serviceType === "both" ? ["residential", "commercial"] : [serviceType];

    const { error: cleanerErr } = await supabase.from("cleaners").upsert({
      id: user.id,
      bio,
      service_types: serviceTypes,
      hourly_rate: hourlyRate,
      years_experience: yearsExperience,
      languages,
      status: "new",
    });
    if (cleanerErr) {
      setError(cleanerErr.message);
      setLoading(false);
      return;
    }

    // The cleaner_applications row is created by the `handle_new_user` trigger
    // (role = 'cleaner', guarded by NOT EXISTS), so we no longer insert it here —
    // doing so would create a duplicate application (the table isn't keyed on
    // cleaner_id).

    localStorage.removeItem("pending_signup");
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow p-8 text-center">
          <p className="text-green-700 font-semibold mb-4">{t("auth.registerCleaner.submitted")}</p>
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            {t("auth.login.signIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm font-medium text-gray-600">{t("auth.registerCleaner.settingUp")}</p>
        </div>
      )}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-8">
        <div className="flex justify-between items-center mb-5">
          <button
            type="button"
            onClick={() => router.push("/register")}
            disabled={loading}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("auth.registerCleaner.goBack")}
          </button>
          <LanguageToggle />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("auth.registerCleaner.title")}</h1>
        <p className="text-sm text-gray-600 mb-6">
          {t("auth.registerCleaner.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCleaner.fullName")}</label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                autoComplete="name"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCleaner.phone")}</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                autoComplete="tel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCleaner.bio")}</label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder={t("auth.registerCleaner.bioPlaceholder")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCleaner.serviceType")}</label>
              <select
                id="service_type"
                name="service_type"
                required
                defaultValue=""
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>{t("auth.registerCleaner.selectOption")}</option>
                <option value="residential">{t("common.residential")}</option>
                <option value="commercial">{t("common.commercial")}</option>
                <option value="both">{t("common.both")}</option>
              </select>
            </div>
            <div>
              <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCleaner.hourlyRate")}</label>
              <input
                type="number"
                id="hourly_rate"
                name="hourly_rate"
                min={0}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="years_experience" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCleaner.yearsExperience")}</label>
              <input
                type="number"
                id="years_experience"
                name="years_experience"
                min={0}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCleaner.languages")}</span>
            <div className="flex gap-4">
              {LANGUAGE_OPTIONS.map(lang => (
                <label key={lang} htmlFor={`language-${lang}`} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    id={`language-${lang}`}
                    checked={languages.includes(lang)}
                    onChange={() => toggleLanguage(lang)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {lang}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCleaner.address")}</label>
            <input
              type="text"
              id="address"
              name="address"
              autoComplete="street-address"
              required
              placeholder={t("auth.registerCleaner.addressPlaceholder")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">{t("auth.registerCleaner.addressHint")}</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !creds}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {loading ? <><Spinner />{t("auth.registerCleaner.finishing")}</> : t("auth.registerCleaner.finish")}
          </button>
        </form>
      </div>
    </div>
  );
}
