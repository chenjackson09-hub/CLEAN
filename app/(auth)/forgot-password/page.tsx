"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";
import { createClient } from "@/lib/supabase/client";

// Step 1 of "I forgot my password": ask for the email and have Supabase email a code
// (the "Reset password" template must show {{ .Token }}). We never say whether the address has
// an account — the next screen always reads the same — so this can't be used to find out who is
// registered.
export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = email.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(clean);
    // Only a rate limit / sending problem is shown; "no such account" never reaches us.
    if (err && (err.status === 429 || /rate limit|too many|seconds/i.test(err.message))) {
      setError(t("auth.forgot.tooSoon"));
      setLoading(false);
      return;
    }
    if (err && err.status && err.status >= 500) {
      setError(t("auth.forgot.failed"));
      setLoading(false);
      return;
    }
    router.push(`/reset-password?email=${encodeURIComponent(clean)}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow p-8">
        <div className="flex justify-end mb-2">
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("auth.forgot.title")}</h1>
        <p className="text-sm text-gray-600 mb-6">{t("auth.forgot.subtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.login.email")}</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
              disabled={loading}
              className="w-full border border-gray-300 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-full px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-blue-600 text-white rounded-full py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t("auth.forgot.sending") : t("auth.forgot.send")}
          </button>
        </form>

        <p className="mt-4 text-sm text-center">
          <Link href="/login" className="text-blue-600 hover:underline">{t("auth.forgot.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
