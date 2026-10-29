"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserRole } from "@/types/database";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

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
  const [emailTaken, setEmailTaken] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  async function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const email = e.target.value.trim();
    if (!email || !email.includes("@")) return;
    setCheckingEmail(true);
    const supabase = createClient();
    const { data: exists } = await supabase.rpc("email_exists", { check_email: email });
    setCheckingEmail(false);
    setEmailTaken(!!exists);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role) return;
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError(t("auth.register.passwordMismatch"));
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data: exists, error: checkErr } = await supabase.rpc("email_exists", { check_email: email });
    if (checkErr) {
      setError(checkErr.message);
      setLoading(false);
      return;
    }
    if (exists) {
      setEmailTaken(true);
      setError(t("auth.register.emailTaken"));
      setLoading(false);
      return;
    }

    // The account is created RIGHT HERE (the role goes in as metadata so the signup trigger
    // builds the right profile rows). Everything the wizard collects next is saved step by
    // step, so a closed tab or a dropped connection never loses answers — and the password is
    // never kept in the browser. The person is approved by an admin only after they submit.
    const { data: created, error: signUpErr } = await supabase.auth.signUp({ email, password, options: { data: { role } } });
    if (signUpErr || !created.session) {
      setError(signUpErr?.message ?? t("auth.register.signUpFailed"));
      setLoading(false);
      return;
    }
    router.push(`/register/${role}`);
  }

  // Google sign-up needs no role/email/password here — a first-time Google
  // auth creates the account on its own (handle_new_user defaults it to
  // customer), and /auth/callback already routes a not-yet-onboarded Google
  // user to /onboarding, where they pick cleaner vs. customer. Same handler
  // as the login page's "Continue with Google".
  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthErr) {
      setError(oauthErr.message);
      setLoading(false);
    }
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
        <p className="text-sm text-gray-600 mb-6">{t("auth.register.subtitle")}</p>

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
            <div className="text-xs text-gray-600 mt-0.5">{t("auth.register.customerDesc")}</div>
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
            <div className="text-xs text-gray-600 mt-0.5">{t("auth.register.cleanerDesc")}</div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.register.email")}</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              disabled={loading}
              onChange={() => {
                if (emailTaken) setEmailTaken(false);
                if (error) setError(null);
              }}
              onBlur={handleEmailBlur}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {checkingEmail && (
              <p className="text-xs text-gray-400 mt-1">{t("auth.register.checkingEmail")}</p>
            )}
            {emailTaken && !checkingEmail && (
              <p className="text-sm text-red-600 mt-1">
                {t("auth.register.emailTaken")}{" "}
                <Link href="/login" className="underline font-medium">{t("auth.register.signIn")}</Link>
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.register.password")}</label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.register.confirmPassword")}</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
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
            disabled={!role || loading || emailTaken}
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

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs uppercase tracking-wide text-gray-400">{t("auth.register.or")}</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-full py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <GoogleIcon />
          {t("auth.register.google")}
        </button>

        <p className="mt-4 text-sm text-center text-gray-600">
          {t("auth.register.haveAccount")}{" "}
          <Link href="/login" className="text-blue-600 hover:underline">{t("auth.register.signIn")}</Link>
        </p>
      </div>
    </div>
  );
}
