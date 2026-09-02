"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { geocodeAddress } from "@/lib/geocode";
import { normalizeImageToJpeg } from "@/lib/image/normalizeImage";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";
import { WORK_AREAS } from "@/lib/workAreas";
import { signOutToLogin } from "../../actions";

type FreqType = "num" | "monthly" | "other";
type MatchType = "recurring" | "occasional" | "other";

type Answers = {
  name: string;
  photoFile: File | null;
  photoPreview: string | null;
  birthD: string;
  birthM: string;
  birthY: string;
  loc: string;
  freqType: FreqType;
  freqVal: number;
  freqOtherText: string;
  rate: string;
  duration: string;
  maxDuration: string;
  maxDurationNoLimit: boolean;
  services: string[];
  serviceOtherText: string;
  matchTypes: string[];
  matchOtherText: string;
  car: "yes" | "no" | null;
  gas: "yes" | "no" | null;
  gasAmt: string;
  areas: string[];
  bio: string;
};

const SERVICE_KEYS: { value: string; key: string }[] = [
  { value: "General home cleaning", key: "svcGeneral" },
  { value: "Deep cleaning", key: "svcDeep" },
  { value: "Closets", key: "svcClosets" },
  { value: "Windows", key: "svcWindows" },
  { value: "Laundry", key: "svcLaundry" },
  { value: "Pesach", key: "svcPesach" },
  { value: "Move-in", key: "svcMoveIn" },
  { value: "Move-out", key: "svcMoveOut" },
  { value: "Airbnb", key: "svcAirbnb" },
  { value: "Organization", key: "svcOrganization" },
  { value: "Newly renovated", key: "svcRenovated" },
  { value: "Pet friendly", key: "svcPetFriendly" },
  { value: "Residential cleaning", key: "svcResidential" },
  { value: "Commercial cleaning", key: "svcCommercial" },
  { value: "Offices", key: "svcOffices" },
  { value: "Other", key: "svcOther" },
];

const MATCH_OPTS: { value: MatchType; key: string }[] = [
  { value: "recurring", key: "matchRecurring" },
  { value: "occasional", key: "matchOccasional" },
  { value: "other", key: "matchOther" },
];

const DEFAULTED_KEYS = ["freq", "rate", "duration", "maxDuration", "gasrate"];
const REQUIRED_KEYS = ["name", "birth", "loc", "services", "match", "areas"];

const initialAnswers: Answers = {
  name: "",
  photoFile: null,
  photoPreview: null,
  birthD: "",
  birthM: "",
  birthY: "",
  loc: "",
  freqType: "num",
  freqVal: 3,
  freqOtherText: "",
  rate: "75",
  duration: "3",
  maxDuration: "5",
  maxDurationNoLimit: false,
  services: [],
  serviceOtherText: "",
  matchTypes: [],
  matchOtherText: "",
  car: null,
  gas: null,
  gasAmt: "1",
  areas: [],
  bio: "",
};

function ageFromParts(d: string, m: string, y: string): number | null {
  if (!d || !m || !y) return null;
  const birth = new Date(Number(y), Number(m) - 1, Number(d));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const mDiff = today.getMonth() - birth.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fmt2(v: string): string {
  const n = parseFloat(v);
  return Number.isNaN(n) ? "1.00" : n.toFixed(2);
}

export default function CleanerRegisterPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"flow" | "confirm" | "congrats">("flow");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem("pending_signup");
    if (!raw) {
      router.replace("/register");
      return;
    }
    setCreds(JSON.parse(raw));
  }, [router]);

  const steps = [
    { key: "name" },
    { key: "photo" },
    { key: "birth" },
    { key: "loc" },
    { key: "freq" },
    { key: "rate" },
    { key: "duration" },
    { key: "maxDuration" },
    { key: "services" },
    { key: "match" },
    { key: "car" },
    ...(answers.car === "yes" ? [{ key: "gas" }] : []),
    ...(answers.car === "yes" && answers.gas === "yes" ? [{ key: "gasrate" }] : []),
    { key: "areas" },
    { key: "bio" },
  ];

  function markVisited(key: string) {
    setVisited((prev) => new Set(prev).add(key));
  }

  function isAnswered(key: string): boolean {
    if (DEFAULTED_KEYS.includes(key)) return visited.has(key);
    switch (key) {
      case "name":
        return answers.name.trim().length > 0;
      case "photo":
        return !!answers.photoFile;
      case "birth":
        return !!(answers.birthD && answers.birthM && answers.birthY);
      case "loc":
        return answers.loc.trim().length > 0;
      case "services":
        return answers.services.length > 0;
      case "match":
        return answers.matchTypes.length > 0;
      case "car":
        return answers.car !== null;
      case "areas":
        return answers.areas.length > 0;
      case "gas":
        return answers.gas !== null;
      case "bio":
        return answers.bio.trim().length > 0;
      default:
        return false;
    }
  }

  function isStepValid(key: string): boolean {
    if (!REQUIRED_KEYS.includes(key)) return true;
    return isAnswered(key);
  }

  const progressPct = (() => {
    const count = steps.filter((s) => isAnswered(s.key)).length;
    return Math.max(20, Math.min(100, Math.round(20 + (count / steps.length) * 80)));
  })();

  const current = steps[step];
  const isLast = step === steps.length - 1;

  function goNext() {
    if (!isStepValid(current.key)) return;
    if (isLast) {
      void handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }
  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  useEffect(() => {
    markVisited(current.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function handlePhotoPick(mode: "camera" | "library" | "computer") {
    setPhotoMenuOpen(false);
    if (fileInputRef.current) {
      if (mode === "camera") fileInputRef.current.setAttribute("capture", "environment");
      else fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const normalized = await normalizeImageToJpeg(file);
    setAnswers((a) => ({ ...a, photoFile: normalized, photoPreview: URL.createObjectURL(normalized) }));
  }

  function toggleArrayValue(key: "services" | "areas" | "matchTypes", value: string) {
    setAnswers((a) => {
      const arr = a[key];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...a, [key]: next };
    });
  }

  // Signs up (or reuses the pending account), uploads the photo if any, and
  // upserts everything collected so far. Used both by the final "Submit" and
  // by "Yes, continue later" on partial exit — an incomplete application is
  // fine; /cleaner/profile shows what's still missing afterward.
  async function saveAndFinish() {
    if (!creds) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: creds.email,
      password: creds.password,
      options: { data: { role: "cleaner" } },
    });
    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return false;
    }
    const user = signUpData.user;
    if (!user) {
      setError("Sign up failed. Please try again.");
      setLoading(false);
      return false;
    }

    let avatarUrl: string | undefined;
    if (answers.photoFile) {
      const ext = answers.photoFile.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, answers.photoFile, { upsert: true, contentType: answers.photoFile.type });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      }
    }

    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: user.id,
      role: "cleaner",
      full_name: answers.name || null,
      ...(avatarUrl && { avatar_url: avatarUrl }),
    });
    if (profileErr) {
      setError(profileErr.message);
      setLoading(false);
      return false;
    }

    const location = answers.loc ? await geocodeAddress(answers.loc) : null;

    const birthdate =
      answers.birthD && answers.birthM && answers.birthY
        ? `${answers.birthY}-${String(answers.birthM).padStart(2, "0")}-${String(answers.birthD).padStart(2, "0")}`
        : null;

    // weekly_clean_target holds the numeric answer; weekly_clean_other carries
    // the free-text description when the cleaner picked "a few times a month"
    // or wrote in their own answer instead of a number.
    const weeklyCleanTarget = answers.freqType === "num" ? answers.freqVal : 0;
    const weeklyCleanOther =
      answers.freqType === "monthly"
        ? t("auth.registerCleaner.freqMonthly")
        : answers.freqType === "other"
          ? answers.freqOtherText || null
          : null;

    const { error: cleanerErr } = await supabase.from("cleaners").upsert({
      id: user.id,
      bio: answers.bio || null,
      cleaning_categories: answers.services,
      cleaning_category_other: answers.services.includes("Other") ? answers.serviceOtherText || null : null,
      hourly_rate: answers.rate ? Number(answers.rate) : null,
      min_hours: answers.duration ? Number(answers.duration) : null,
      max_hours: answers.maxDurationNoLimit ? null : answers.maxDuration ? Number(answers.maxDuration) : null,
      address: answers.loc || null,
      ...(location && { location: `POINT(${location.lng} ${location.lat})` }),
      birthdate,
      weekly_clean_target: weeklyCleanTarget,
      weekly_clean_other: weeklyCleanOther,
      has_car: answers.car,
      gas_return_enabled: answers.car === "yes" && answers.gas === "yes",
      gas_return_rate: answers.car === "yes" && answers.gas === "yes" ? Number(answers.gasAmt || "1") : null,
      match_preferences: answers.matchTypes,
      match_preference_other: answers.matchTypes.includes("other") ? answers.matchOtherText || null : null,
      work_areas: answers.areas,
    });
    if (cleanerErr) {
      setError(cleanerErr.message);
      setLoading(false);
      return false;
    }

    localStorage.removeItem("pending_signup");
    setLoading(false);
    return true;
  }

  async function handleSubmit() {
    const ok = await saveAndFinish();
    if (ok) setPhase("congrats");
  }

  async function handleContinueLater() {
    const ok = await saveAndFinish();
    // Their partial answers are already saved — sign them out and send them
    // to /login rather than the dashboard, since "continue later" means they
    // pick this back up on their next visit.
    if (ok) await signOutToLogin();
  }

  const ageDisplay = ageFromParts(answers.birthD, answers.birthM, answers.birthY);
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(lang === "he" ? "he" : "en", { month: "short" }).format(new Date(2020, i, 1))
  );
  const curYear = new Date().getFullYear();

  if (phase === "congrats") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow p-8 text-center flex flex-col items-center gap-3">
          <div className="text-4xl">✅</div>
          <p className="text-lg font-semibold text-gray-900">{t("auth.registerCleaner.congratsTitle")}</p>
          <button
            onClick={() => router.push("/cleaner/dashboard")}
            className="mt-2 bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {t("auth.registerCleaner.viewProfile")}
          </button>
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
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-8 min-h-[420px] flex flex-col">
        <div className="flex justify-end mb-3">
          <LanguageToggle />
        </div>

        {phase === "confirm" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <p className="text-base font-semibold text-gray-900">{t("auth.registerCleaner.closeConfirmTitle")}</p>
            <p className="text-sm text-gray-600">
              {t("auth.registerCleaner.closeConfirmBody", { pct: progressPct })}
            </p>
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={handleContinueLater}
                className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {t("auth.registerCleaner.continueLater")}
              </button>
              <button
                onClick={() => setPhase("flow")}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t("auth.registerCleaner.keepGoing")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-900 min-w-[2.5rem] text-end">{progressPct}%</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPhase("confirm")}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {current.key === "name" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-4">{t("auth.registerCleaner.qName")}</p>
                  <input
                    type="text"
                    autoFocus
                    value={answers.name}
                    onChange={(e) => setAnswers((a) => ({ ...a, name: e.target.value }))}
                    placeholder={t("auth.registerCleaner.phName")}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}

              {current.key === "photo" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-4">{t("auth.registerCleaner.qPhoto")}</p>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPhotoMenuOpen((o) => !o)}
                      className="w-20 h-20 rounded-full border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center"
                    >
                      {answers.photoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={answers.photoPreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-gray-400">📷</span>
                      )}
                    </button>
                    {photoMenuOpen && (
                      <div className="absolute top-24 start-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[200px] overflow-hidden">
                        <button type="button" onClick={() => handlePhotoPick("camera")} className="w-full text-start px-4 py-2.5 text-sm hover:bg-gray-50">
                          {t("auth.registerCleaner.photoTakePhoto")}
                        </button>
                        <button type="button" onClick={() => handlePhotoPick("library")} className="w-full text-start px-4 py-2.5 text-sm hover:bg-gray-50">
                          {t("auth.registerCleaner.photoCameraRoll")}
                        </button>
                        <button type="button" onClick={() => handlePhotoPick("computer")} className="w-full text-start px-4 py-2.5 text-sm hover:bg-gray-50">
                          {t("auth.registerCleaner.photoChooseComputer")}
                        </button>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2.5">{t("auth.registerCleaner.photoTip")}</p>
                </>
              )}

              {current.key === "birth" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-1">{t("auth.registerCleaner.qBirth")}</p>
                  <p className="text-sm text-gray-500 mb-4">{t("auth.registerCleaner.birthSub")}</p>
                  <div className="flex gap-2">
                    <select
                      value={answers.birthD}
                      onChange={(e) => setAnswers((a) => ({ ...a, birthD: e.target.value }))}
                      className="flex-1 border border-gray-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t("auth.registerCleaner.dayLabel")}</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      value={answers.birthM}
                      onChange={(e) => setAnswers((a) => ({ ...a, birthM: e.target.value }))}
                      className="flex-[1.5] border border-gray-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t("auth.registerCleaner.monthLabel")}</option>
                      {monthNames.map((name, i) => (
                        <option key={i} value={i + 1}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={answers.birthY}
                      onChange={(e) => setAnswers((a) => ({ ...a, birthY: e.target.value }))}
                      className="flex-[1.2] border border-gray-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t("auth.registerCleaner.yearLabel")}</option>
                      {Array.from({ length: 101 }, (_, i) => curYear - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  {ageDisplay !== null && (
                    <p className="text-sm text-gray-500 mt-2.5">{t("auth.registerCleaner.ageOut", { age: ageDisplay })}</p>
                  )}
                  {ageDisplay !== null && ageDisplay < 18 && (
                    <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                      {t("auth.registerCleaner.minorNotice")}
                    </p>
                  )}
                </>
              )}

              {current.key === "loc" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-1">{t("auth.registerCleaner.qLoc")}</p>
                  <p className="text-sm text-gray-500 mb-4">{t("auth.registerCleaner.locSub")}</p>
                  <input
                    type="text"
                    autoFocus
                    value={answers.loc}
                    onChange={(e) => setAnswers((a) => ({ ...a, loc: e.target.value }))}
                    placeholder={t("auth.registerCleaner.phLoc")}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}

              {current.key === "freq" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-4">{t("auth.registerCleaner.qFreq")}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, freqType: "num", freqVal: n }))}
                        className={`w-9 h-9 rounded-full border text-sm font-medium ${
                          answers.freqType === "num" && answers.freqVal === n
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, freqType: "monthly" }))}
                      className={`px-3 py-2 rounded-full border text-sm ${
                        answers.freqType === "monthly" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      {t("auth.registerCleaner.freqMonthly")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, freqType: "other" }))}
                      className={`px-3 py-2 rounded-full border text-sm ${
                        answers.freqType === "other" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      {t("auth.registerCleaner.freqOther")}
                    </button>
                  </div>
                  {answers.freqType === "other" && (
                    <input
                      type="text"
                      value={answers.freqOtherText}
                      onChange={(e) => setAnswers((a) => ({ ...a, freqOtherText: e.target.value }))}
                      placeholder={t("auth.registerCleaner.freqOtherPh")}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mt-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-3">{t("auth.registerCleaner.freqNote")}</p>
                </>
              )}

              {current.key === "rate" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-4">{t("auth.registerCleaner.qRate")}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">₪</span>
                    <input
                      type="number"
                      value={answers.rate}
                      onChange={(e) => setAnswers((a) => ({ ...a, rate: e.target.value }))}
                      className="w-28 border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">/hr</span>
                  </div>
                </>
              )}

              {current.key === "duration" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-4">{t("auth.registerCleaner.qDuration")}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={answers.duration}
                      onChange={(e) => setAnswers((a) => ({ ...a, duration: e.target.value }))}
                      className="w-28 border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">hrs</span>
                  </div>
                </>
              )}

              {current.key === "maxDuration" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-4">{t("auth.registerCleaner.qMaxDuration")}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="number"
                      step="0.5"
                      value={answers.maxDuration}
                      disabled={answers.maxDurationNoLimit}
                      onChange={(e) => setAnswers((a) => ({ ...a, maxDuration: e.target.value }))}
                      className="w-28 border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                    />
                    <span className="text-sm text-gray-500">hrs</span>
                    <button
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, maxDurationNoLimit: !a.maxDurationNoLimit }))}
                      className={`px-3 py-2 rounded-full border text-sm ${
                        answers.maxDurationNoLimit ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      {t("auth.registerCleaner.noLimit")}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">{t("auth.registerCleaner.qMaxDurationNote")}</p>
                </>
              )}

              {current.key === "services" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-1">{t("auth.registerCleaner.qServices")}</p>
                  <p className="text-sm text-gray-500 mb-4">{t("auth.registerCleaner.servicesSub")}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {SERVICE_KEYS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleArrayValue("services", s.value)}
                        className={`px-3 py-1.5 rounded-full border text-sm ${
                          answers.services.includes(s.value) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {t(`auth.registerCleaner.${s.key}`)}
                      </button>
                    ))}
                  </div>
                  {answers.services.includes("Other") && (
                    <input
                      type="text"
                      value={answers.serviceOtherText}
                      onChange={(e) => setAnswers((a) => ({ ...a, serviceOtherText: e.target.value }))}
                      placeholder={t("auth.registerCleaner.servicesOtherPh")}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mt-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </>
              )}

              {current.key === "match" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-1">{t("auth.registerCleaner.qMatch")}</p>
                  <p className="text-sm text-gray-500 mb-4">{t("auth.registerCleaner.matchSub")}</p>
                  <div className="flex flex-col gap-2">
                    {MATCH_OPTS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleArrayValue("matchTypes", opt.value)}
                        className={`text-start px-3.5 py-2.5 rounded-xl border text-sm ${
                          answers.matchTypes.includes(opt.value) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {t(`auth.registerCleaner.${opt.key}`)}
                      </button>
                    ))}
                  </div>
                  {answers.matchTypes.includes("other") && (
                    <input
                      type="text"
                      value={answers.matchOtherText}
                      onChange={(e) => setAnswers((a) => ({ ...a, matchOtherText: e.target.value }))}
                      placeholder={t("auth.registerCleaner.matchOtherPh")}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mt-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </>
              )}

              {current.key === "car" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-4">{t("auth.registerCleaner.qCar")}</p>
                  <div className="flex gap-2">
                    {(["yes", "no"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, car: v, ...(v === "no" ? { gas: null } : {}) }))}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${
                          answers.car === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {t(`auth.registerCleaner.${v}`)}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {current.key === "gas" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-4">{t("auth.registerCleaner.qGas")}</p>
                  <div className="flex gap-2">
                    {(["yes", "no"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, gas: v }))}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${
                          answers.gas === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {t(`auth.registerCleaner.${v}`)}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {current.key === "gasrate" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-4">{t("auth.registerCleaner.qGasRate")}</p>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xl font-medium">₪</span>
                    <input
                      type="number"
                      step="0.01"
                      value={fmt2(answers.gasAmt)}
                      onChange={(e) => setAnswers((a) => ({ ...a, gasAmt: e.target.value }))}
                      className="w-24 border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">{t("auth.registerCleaner.perKm")}</span>
                  </div>
                </>
              )}

              {current.key === "areas" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-1">{t("auth.registerCleaner.qAreas")}</p>
                  <p className="text-sm text-gray-500 mb-4">{t("auth.registerCleaner.areasSub")}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {WORK_AREAS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleArrayValue("areas", area)}
                        className={`px-3 py-1.5 rounded-full border text-sm ${
                          answers.areas.includes(area) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {current.key === "bio" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-1">{t("auth.registerCleaner.qBio")}</p>
                  <p className="text-sm text-gray-500 mb-4">{t("auth.registerCleaner.bioSub2")}</p>
                  <textarea
                    rows={4}
                    value={answers.bio}
                    onChange={(e) => setAnswers((a) => ({ ...a, bio: e.target.value }))}
                    placeholder={t("auth.registerCleaner.bioPlaceholder")}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-4">{error}</p>}
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                type="button"
                onClick={goBack}
                className={`px-3.5 py-2 text-sm text-gray-600 hover:text-gray-900 ${step === 0 ? "invisible" : ""}`}
              >
                {t("auth.registerCleaner.back")}
              </button>
              <button
                type="button"
                disabled={!isStepValid(current.key) || loading}
                onClick={goNext}
                className="w-28 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLast ? t("auth.registerCleaner.submit") : t("auth.registerCleaner.next")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
