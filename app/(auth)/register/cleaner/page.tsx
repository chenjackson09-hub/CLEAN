"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LocalityPicker from "@/components/LocalityPicker";
import type { PickedLocality } from "@/lib/localities/address";
import { normalizeImageToJpeg } from "@/lib/image/normalizeImage";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";
import { signOutToLogin } from "../../actions";
import { loadOnboarding, saveOnboarding } from "../../onboardingActions";
import { CLEANER_SERVICES } from "@/lib/onboarding/options";
import type { CleanerDraft } from "@/lib/onboarding/cleaner";
import { ROLE_HOME } from "@/lib/roleHome";

type FreqType = "num" | "monthly" | "other";
type MatchType = "recurring" | "occasional" | "other";

type Answers = {
  name: string;
  // The photo already saved to the account (if any); `photoFile` is a NEW pick not yet uploaded.
  avatarUrl: string | null;
  photoFile: File | null;
  photoPreview: string | null;
  birthD: string;
  birthM: string;
  birthY: string;
  loc: string;
  // The official locality picked from the list (preferred over the typed `loc`).
  locality: PickedLocality | null;
  locManual: boolean;
  freqType: FreqType;
  freqVal: number;
  freqOtherText: string;
  rate: string;
  duration: string;
  maxDuration: string;
  radius: string;
  maxDurationNoLimit: boolean;
  services: string[];
  serviceOtherText: string;
  matchTypes: string[];
  matchOtherText: string;
  car: "yes" | "no" | null;
  gas: "yes" | "no" | null;
  gasAmt: string;
  bio: string;
};

const SERVICE_KEYS = CLEANER_SERVICES;

const MATCH_OPTS: { value: MatchType; key: string }[] = [
  { value: "recurring", key: "matchRecurring" },
  { value: "occasional", key: "matchOccasional" },
  { value: "other", key: "matchOther" },
];

const DEFAULTED_KEYS = ["freq", "rate", "duration", "maxDuration", "gasrate", "radius"];
const REQUIRED_KEYS = ["name", "birth", "loc", "services", "match"];

const initialAnswers: Answers = {
  name: "",
  avatarUrl: null,
  photoFile: null,
  photoPreview: null,
  birthD: "",
  birthM: "",
  birthY: "",
  loc: "",
  locality: null,
  locManual: false,
  freqType: "num",
  freqVal: 3,
  freqOtherText: "",
  rate: "75",
  duration: "3",
  maxDuration: "5",
  radius: "10",
  maxDurationNoLimit: false,
  services: [],
  serviceOtherText: "",
  matchTypes: [],
  matchOtherText: "",
  car: null,
  gas: null,
  gasAmt: "1",
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


// The wizard's answers <-> what the server saves. Only plain values cross to the server.
function answersToDraft(a: Answers, avatarUrl: string | null): CleanerDraft {
  return {
    name: a.name, avatarUrl, birthD: a.birthD, birthM: a.birthM, birthY: a.birthY,
    localityId: a.locality?.id ?? null, loc: a.locality ? "" : a.loc, radius: a.radius,
    freqType: a.freqType, freqVal: a.freqVal, freqOtherText: a.freqOtherText,
    rate: a.rate, duration: a.duration, maxDuration: a.maxDuration, maxDurationNoLimit: a.maxDurationNoLimit,
    services: a.services, serviceOtherText: a.serviceOtherText, matchTypes: a.matchTypes, matchOtherText: a.matchOtherText,
    car: a.car, gas: a.gas, gasAmt: a.gasAmt, bio: a.bio,
  };
}

function draftToAnswers(d: CleanerDraft, locality: PickedLocality | null): Answers {
  return {
    ...initialAnswers,
    name: d.name, avatarUrl: d.avatarUrl, photoPreview: d.avatarUrl,
    birthD: d.birthD, birthM: d.birthM, birthY: d.birthY,
    loc: d.loc, locality, locManual: !locality && d.loc !== "",
    radius: d.radius, freqType: d.freqType, freqVal: d.freqVal, freqOtherText: d.freqOtherText,
    rate: d.rate, duration: d.duration, maxDuration: d.maxDuration, maxDurationNoLimit: d.maxDurationNoLimit,
    services: d.services, serviceOtherText: d.serviceOtherText, matchTypes: d.matchTypes, matchOtherText: d.matchOtherText,
    car: d.car, gas: d.gas, gasAmt: d.gasAmt, bio: d.bio,
  };
}

function buildSteps(a: Answers): { key: string }[] {
  return [
    { key: "name" },
    { key: "photo" },
    { key: "birth" },
    { key: "loc" },
    { key: "radius" },
    { key: "freq" },
    { key: "rate" },
    { key: "duration" },
    { key: "maxDuration" },
    { key: "services" },
    { key: "match" },
    { key: "car" },
    ...(a.car === "yes" ? [{ key: "gas" }] : []),
    ...(a.car === "yes" && a.gas === "yes" ? [{ key: "gasrate" }] : []),
    { key: "bio" },
  ];
}

export default function CleanerRegisterPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"flow" | "confirm" | "congrats">("flow");
  const [loading, setLoading] = useState(false);
  // True while a single screen is being saved (the Continue button shows "Saving…").
  const [saving, setSaving] = useState(false);
  // False until the saved answers have been loaded (so the screen never flashes empty).
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The account already exists (it is created on the first sign-up screen), so load what was
  // saved and continue exactly where the person stopped.
  useEffect(() => {
    let alive = true;
    (async () => {
      const state = await loadOnboarding();
      if (!alive) return;
      if ("error" in state) {
        router.replace("/register");
        return;
      }
      if (state.completed) {
        router.replace(ROLE_HOME[state.role]);
        return;
      }
      if (state.role !== "cleaner") {
        router.replace(`/register/${state.role}`);
        return;
      }
      const loaded = draftToAnswers(state.draft as CleanerDraft, state.locality);
      const keys = buildSteps(loaded);
      const start = Math.min(state.step, keys.length - 1);
      setAnswers(loaded);
      setStep(start);
      setVisited(new Set(keys.slice(0, start).map((k) => k.key)));
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  const steps = buildSteps(answers);

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
        return answers.locality != null || answers.loc.trim().length > 0;
      case "services":
        return answers.services.length > 0;
      case "match":
        return answers.matchTypes.length > 0;
      case "car":
        return answers.car !== null;
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

  // Every Continue saves that screen first, so nothing is lost if the person leaves.
  async function goNext() {
    if (!isStepValid(current.key) || saving) return;
    if (isLast) {
      void handleSubmit();
      return;
    }
    setSaving(true);
    const ok = await persist(false, step + 1);
    setSaving(false);
    if (ok) setStep((s) => s + 1);
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

  function toggleArrayValue(key: "services" | "matchTypes", value: string) {
    setAnswers((a) => {
      const arr = a[key];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...a, [key]: next };
    });
  }

  // Saves everything collected so far. A new photo is uploaded first (the account exists, so
  // it has its own storage folder); the server then checks and writes the answers. With
  // `submit` it also checks the required answers and marks the sign-up finished.
  async function persist(submit: boolean, nextStep: number = step): Promise<boolean> {
    setError(null);
    const supabase = createClient();
    let avatarUrl = answers.avatarUrl;
    if (answers.photoFile) {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setError(t("auth.registerCleaner.signUpFailed"));
        return false;
      }
      const ext = answers.photoFile.name.split(".").pop();
      const path = `${auth.user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, answers.photoFile, { upsert: true, contentType: answers.photoFile.type });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
        setAnswers((a) => ({ ...a, avatarUrl, photoFile: null, photoPreview: avatarUrl }));
      }
    }
    const res = await saveOnboarding({ role: "cleaner", draft: answersToDraft(answers, avatarUrl), step: nextStep, submit });
    if ("error" in res) {
      setError(res.error);
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    const ok = await persist(true);
    setLoading(false);
    if (ok) setPhase("congrats");
  }

  async function handleContinueLater() {
    setLoading(true);
    const ok = await persist(false);
    // Their answers are saved — sign them out and send them to /login. Signing back in
    // resumes this wizard where they stopped.
    if (ok) await signOutToLogin();
    else setLoading(false);
  }

  const ageDisplay = ageFromParts(answers.birthD, answers.birthM, answers.birthY);
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(lang === "he" ? "he" : "en", { month: "short" }).format(new Date(2020, i, 1))
  );
  const curYear = new Date().getFullYear();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-500">{t("auth.registerCleaner.settingUp")}</p>
      </div>
    );
  }

  if (phase === "congrats") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow p-8 text-center flex flex-col items-center gap-3">
          <div className="text-4xl">✅</div>
          <p className="text-lg font-semibold text-gray-900">{t("auth.registerCleaner.congratsTitle")}</p>
          <button
            onClick={() => router.push("/cleaner/availability?welcome=1")}
            className="mt-2 bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {t("auth.registerCleaner.startBooking")}
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
                  <LocalityPicker
                    lang={lang === "he" ? "he" : "en"}
                    value={answers.locality}
                    onChange={(l) => setAnswers((a) => ({ ...a, locality: l }))}
                    autoFocus
                  />
                  {!answers.locality && (
                    <div className="mt-3">
                      {answers.locManual ? (
                        <input
                          type="text"
                          value={answers.loc}
                          onChange={(e) => setAnswers((a) => ({ ...a, loc: e.target.value }))}
                          placeholder={t("auth.registerCleaner.phLoc")}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, locManual: true }))}
                          className="text-sm text-gray-500 underline"
                        >
                          {t("auth.registerCleaner.locManual")}
                        </button>
                      )}
                    </div>
                  )}
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

              {current.key === "radius" && (
                <>
                  <p className="text-lg font-medium text-gray-900 mb-1">{t("auth.registerCleaner.qRadius")}</p>
                  <p className="text-sm text-gray-500 mb-4">{t("auth.registerCleaner.radiusSub")}</p>
                  <p className="text-center text-3xl font-bold text-blue-600 mb-3">
                    {t("auth.registerCleaner.radiusValue").replace("{n}", answers.radius)}
                  </p>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    step={1}
                    value={answers.radius}
                    onChange={(e) => setAnswers((a) => ({ ...a, radius: e.target.value }))}
                    aria-label={t("auth.registerCleaner.qRadius")}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span>
                    <span>50</span>
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
                disabled={!isStepValid(current.key) || loading || saving}
                onClick={goNext}
                className="w-28 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? t("auth.registerCleaner.saving") : isLast ? t("auth.registerCleaner.submit") : t("auth.registerCleaner.next")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
