"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserRole } from "@/types/database";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white inline-block me-2"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role) return;
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Hold credentials in localStorage — the Supabase account is created only
    // when the user completes and submits the role-specific onboarding form.
    // This way pressing "Go back" never leaves a half-created account behind.
    localStorage.setItem("pending_signup", JSON.stringify({ email, password }));
    router.push(`/register/${role}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <svg
            className="animate-spin h-10 w-10 text-blue-600 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-600">{t("auth.register.creatingAccount")}</p>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <div className="flex justify-end mb-2">
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("auth.register.title")}</h1>
        <p className="text-sm text-gray-500 mb-6">{t("auth.register.subtitle")}</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole("customer")}
            disabled={loading}
            className={`border-2 rounded-xl p-4 text-start transition-colors ${
              role === "customer"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-2xl mb-1">🏠</div>
            <div className="font-semibold text-sm text-gray-900">{t("auth.register.customer")}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t("auth.register.customerDesc")}</div>
          </button>
          <button
            type="button"
            onClick={() => setRole("cleaner")}
            disabled={loading}
            className={`border-2 rounded-xl p-4 text-start transition-colors ${
              role === "cleaner"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-2xl mb-1">🧹</div>
            <div className="font-semibold text-sm text-gray-900">{t("auth.register.cleaner")}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t("auth.register.cleanerDesc")}</div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.register.email")}</label>
            <input
              type="email"
              name="email"
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.register.password")}</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={!role || loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Spinner />
                {t("auth.register.creatingAccount")}
              </>
            ) : (
              t("auth.register.continue")
            )}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-500">
          {t("auth.register.haveAccount")}{" "}
          <Link href="/login" className="text-blue-600 hover:underline">{t("auth.register.signIn")}</Link>
        </p>
      </div>
    </div>
  );
}
