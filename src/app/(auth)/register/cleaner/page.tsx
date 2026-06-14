"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/context/LangContext";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function CleanerOnboardingPage() {
  const { t } = useLang();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
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

    const fullName = formData.get("full_name") as string;
    if (!/^[a-zA-Z\s]+$/.test(fullName) || !fullName.trim().includes(" ")) {
      setNameError("invalid");
      setLoading(false);
      return;
    }
    setNameError(null);

    const rawPhone = formData.get("phone") as string;
    if (!/^05\d-?\d{7}$/.test(rawPhone)) {
      setPhoneError("invalid");
      setLoading(false);
      return;
    }
    setPhoneError(null);
    const phone = rawPhone.replace("-", "");

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
      setError("Sign up failed. Please try again.");
      setLoading(false);
      return;
    }

    const bio = formData.get("bio") as string;
    const yearsExp = parseInt(formData.get("years_experience") as string) || 0;
    const languagesRaw = formData.get("languages") as string;
    const languages = languagesRaw.split(",").map((l) => l.trim()).filter(Boolean);
    const docFile = formData.get("id_document") as File;

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

    let docUrl: string | null = null;
    if (docFile && docFile.size > 0) {
      const ext = docFile.name.split(".").pop();
      const path = `${user.id}/id-doc.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("id-documents")
        .upload(path, docFile, { upsert: true });
      if (uploadErr) {
        setError(`Document upload failed: ${uploadErr.message}`);
        setLoading(false);
        return;
      }
      docUrl = path;
    }

    const { error: cleanerErr } = await supabase.from("cleaners").insert({
      id: user.id,
      bio,
      years_experience: yearsExp,
      languages,
      status: "pending",
    });
    if (cleanerErr) {
      setError(cleanerErr.message);
      setLoading(false);
      return;
    }

    await supabase.from("cleaner_applications").insert({
      cleaner_id: user.id,
      id_document_url: docUrl,
      status: "pending",
    });

    localStorage.removeItem("pending_signup");
    router.push("/cleaner/pending");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-base font-medium text-gray-600">{t("onboard_submit_loading")}</p>
        </div>
      )}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-8">
        <button
          type="button"
          onClick={() => router.push("/register")}
          disabled={loading}
          className="flex items-center gap-1 text-base text-gray-400 hover:text-gray-600 mb-5 transition-colors disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("onboard_back")}
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("onboard_title")}</h1>
        <p className="text-base text-gray-500 mb-6">{t("onboard_subtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">{t("onboard_full_name")}</label>
              <input
                type="text"
                name="full_name"
                required
                className={`w-full border rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${nameError ? "border-red-400" : "border-gray-300"}`}
              />
              {nameError && <p className="text-xs text-red-500 mt-1">{t("onboard_name_error")}</p>}
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">{t("onboard_phone")}</label>
              <input
                type="tel"
                name="phone"
                required
                className={`w-full border rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${phoneError ? "border-red-400" : "border-gray-300"}`}
              />
              {phoneError && <p className="text-xs text-red-500 mt-1">{t("onboard_phone_error")}</p>}
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">{t("onboard_bio")}</label>
            <textarea
              name="bio"
              rows={3}
              placeholder={t("onboard_bio_placeholder")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">{t("onboard_experience")}</label>
              <input
                type="number"
                name="years_experience"
                min="0"
                max="50"
                defaultValue="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">{t("onboard_languages")}</label>
              <input
                type="text"
                name="languages"
                placeholder="English, Spanish"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">
              {t("onboard_id_doc")} <span className="text-gray-400">({t("onboard_id_doc_hint")})</span>
            </label>
            <input
              type="file"
              name="id_document"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              className="w-full text-base text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-base file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-400 mt-1">{t("onboard_id_doc_sub")}</p>
          </div>

          {error && (
            <p className="text-base text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !creds}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-base font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {loading ? <><Spinner />{t("onboard_submitting")}</> : t("onboard_submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
