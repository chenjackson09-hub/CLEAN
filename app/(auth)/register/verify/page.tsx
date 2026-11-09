"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";
import { createClient } from "@/lib/supabase/client";

const RESEND_SECONDS = 60;

// The "enter the code we emailed you" step. A new email/password account is created on the
// first sign-up screen; when the project requires confirmed emails, Supabase emails a code
// and the person has no session until they enter it here. Also reached from the login page
// for someone who never finished this step (?resend=1 sends them a fresh code on arrival).
function VerifyForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const email = (params.get("email") ?? "").trim();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(params.get("resend") === "1" ? 0 : RESEND_SECONDS);
  const autoSent = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const resend = useCallback(async () => {
    if (!email) return;
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resend({ type: "signup", email });
    if (err) {
      setError(err.message);
      return;
    }
    setInfo(t("auth.verify.sent"));
    setCooldown(RESEND_SECONDS);
  }, [email, t]);

  // Arriving from the login page: they never received / lost the first code, so send a new one.
  useEffect(() => {
    if (params.get("resend") === "1" && email && !autoSent.current) {
      autoSent.current = true;
      void resend();
    }
  }, [params, email, resend]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = code.replace(/\s+/g, "");
    if (!email || token.length < 6) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    if (err || !data.session) {
      setError(t("auth.verify.invalid"));
      setLoading(false);
      return;
    }
    // Signed in now. The wizard for their role resumes where they left off (a finished
    // account is sent straight home by the middleware).
    const role = data.user?.user_metadata?.role;
    router.push(role === "cleaner" || role === "customer" ? `/register/${role}` : "/");
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
          <p className="text-sm text-gray-600 mb-4">{t("auth.verify.noEmail")}</p>
          <Link href="/register" className="text-blue-600 hover:underline text-sm">{t("auth.verify.startOver")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <div className="flex justify-end mb-2">
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("auth.verify.title")}</h1>
        <p className="text-sm text-gray-600 mb-6">{t("auth.verify.subtitle", { email })}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.verify.codeLabel")}</label>
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

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {info && !error && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{info}</p>}

          <button
            type="submit"
            disabled={loading || code.replace(/\s+/g, "").length < 6}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t("auth.verify.verifying") : t("auth.verify.verify")}
          </button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2 text-sm">
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || loading}
            className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            {cooldown > 0 ? t("auth.verify.resendIn", { n: cooldown }) : t("auth.verify.resend")}
          </button>
          <Link href="/register" className="text-gray-500 hover:underline">{t("auth.verify.startOver")}</Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
