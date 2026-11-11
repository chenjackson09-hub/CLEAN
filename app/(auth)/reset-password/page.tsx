"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";
import { createClient } from "@/lib/supabase/client";

const RESEND_SECONDS = 60;
const MIN_PASSWORD = 6; // same minimum as sign-up

// Step 2: the emailed code + a new password. Entering the code (type "recovery") signs the
// person in for a moment; we set the new password and then sign them out again, so they log in
// with it on the normal login screen.
function ResetForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const email = (params.get("email") ?? "").trim();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function resend() {
    if (!email) return;
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    if (err && (err.status === 429 || /rate limit|too many|seconds/i.test(err.message))) {
      setError(t("auth.forgot.tooSoon"));
      return;
    }
    setInfo(t("auth.reset.sent"));
    setCooldown(RESEND_SECONDS);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = code.replace(/\s+/g, "");
    if (!email || token.length < 6) return;
    if (password.length < MIN_PASSWORD) {
      setError(t("auth.reset.tooShort", { n: MIN_PASSWORD }));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.reset.mismatch"));
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: otpErr } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
    if (otpErr || !data.session) {
      setError(t("auth.reset.invalid"));
      setLoading(false);
      return;
    }
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      await supabase.auth.signOut();
      const same = updErr.code === "same_password" || /different from the old/i.test(updErr.message);
      const weak = updErr.code === "weak_password";
      setError(same ? t("auth.reset.same") : weak ? t("auth.reset.weak") : t("auth.reset.failed"));
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login?reset=1");
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
          <p className="text-sm text-gray-600 mb-4">{t("auth.reset.noEmail")}</p>
          <Link href="/forgot-password" className="text-blue-600 hover:underline text-sm">{t("auth.reset.startOver")}</Link>
        </div>
      </div>
    );
  }

  const field = "w-full border border-gray-300 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow p-8">
        <div className="flex justify-end mb-2">
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("auth.reset.title")}</h1>
        <p className="text-sm text-gray-600 mb-6">{t("auth.reset.subtitle", { email })}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.reset.codeLabel")}</label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={11}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/[^0-9 ]/g, "")); if (error) setError(null); }}
              disabled={loading}
              dir="ltr"
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.reset.newPassword")}</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
              disabled={loading}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.reset.confirmPassword")}</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); if (error) setError(null); }}
              disabled={loading}
              className={field}
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-full px-3 py-2">{error}</p>}
          {info && !error && <p className="text-sm text-green-700 bg-green-50 rounded-full px-3 py-2">{info}</p>}

          <button
            type="submit"
            disabled={loading || code.replace(/\s+/g, "").length < 6 || !password || !confirm}
            className="w-full bg-blue-600 text-white rounded-full py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t("auth.reset.saving") : t("auth.reset.save")}
          </button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2 text-sm">
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || loading}
            className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            {cooldown > 0 ? t("auth.reset.resendIn", { n: cooldown }) : t("auth.reset.resend")}
          </button>
          <Link href="/forgot-password" className="text-gray-500 hover:underline">{t("auth.reset.startOver")}</Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
