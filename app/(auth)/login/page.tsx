"use client";

import { useState } from "react";
import { signIn } from "../actions";
import Link from "next/link";
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

export default function LoginPage() {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm font-medium text-gray-600">{t("auth.login.signingIn")}</p>
        </div>
      )}
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <div className="flex justify-end mb-2">
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("auth.login.title")}</h1>
        <p className="text-sm text-gray-500 mb-6">{t("auth.login.subtitle")}</p>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("auth.login.email")}
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("auth.login.password")}
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {loading ? <><Spinner />{t("auth.login.signingIn")}</> : t("auth.login.signIn")}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-500">
          {t("auth.login.noAccount")}{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            {t("auth.login.register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
