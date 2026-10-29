"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LocalityPicker from "@/components/LocalityPicker";
import WizardShell from "@/components/onboarding/WizardShell";
import PhotoPicker from "@/components/onboarding/PhotoPicker";
import PreviewSection from "@/components/onboarding/PreviewSection";
import GuidedAbout from "@/components/onboarding/GuidedAbout";
import { Chip, OptionCard, Stepper } from "@/components/onboarding/Choice";
import type { PickedLocality } from "@/lib/localities/address";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";
import { signOutToLogin } from "../../actions";
import { loadOnboarding, saveOnboarding } from "../../onboardingActions";
import { CLEANER_SERVICES, EXPERIENCE_RANGES, LANGUAGE_CHIPS, SERVICE_GROUPS } from "@/lib/onboarding/options";
import { ageFromParts, birthProblem } from "@/lib/onboarding/birth";
import type { CleanerDraft } from "@/lib/onboarding/cleaner";
import { ROLE_HOME } from "@/lib/roleHome";

type FreqType = "num" | "monthly" | "other";

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
  // Not asked in the wizard any more (planning-only, moved to Settings) but kept so a value
  // saved earlier is never lost.
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
  experience: string | null;
  languages: string[];
  languagesOther: string;
};

const STEPS = ["you", "where", "getting", "services", "rate", "experience", "prefer", "about", "preview"] as const;
type StepKey = (typeof STEPS)[number];
// Screens that can be left empty: they get a "Skip for now" link.
const OPTIONAL: StepKey[] = ["getting", "rate", "experience", "prefer", "about"];
const PREVIEW = STEPS.length - 1;

const initialAnswers: Answers = {
  name: "", avatarUrl: null, photoFile: null, photoPreview: null, birthD: "", birthM: "", birthY: "",
  loc: "", locality: null, locManual: false, freqType: "num", freqVal: 3, freqOtherText: "",
  rate: "75", duration: "3", maxDuration: "5", radius: "10", maxDurationNoLimit: false,
  services: [], serviceOtherText: "", matchTypes: [], matchOtherText: "", car: null, gas: null, gasAmt: "1", bio: "",
  experience: null, languages: [], languagesOther: "",
};

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
    experience: a.experience, languages: a.languages, languagesOther: a.languagesOther,
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
    experience: d.experience, languages: d.languages, languagesOther: d.languagesOther,
  };
}

// "Either is fine" is the default: nothing ticked, or both, means either.
type WorkChoice = "either" | "regular" | "once";
function workChoiceOf(types: string[]): WorkChoice {
  const r = types.includes("recurring");
  const o = types.includes("occasional");
  if (r && !o) return "regular";
  if (o && !r) return "once";
  return "either";
}

export default function CleanerRegisterPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  // Set when a section is opened from the preview: Continue then goes straight back to it.
  const [returnToPreview, setReturnToPreview] = useState(false);
  const [phase, setPhase] = useState<"flow" | "confirm" | "congrats">("flow");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // False until the saved answers have been loaded (so the screen never flashes empty).
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const tr = (key: string, vars?: Record<string, string | number>) => t(`auth.registerCleaner.${key}`, vars);

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
      setAnswers(draftToAnswers(state.draft as CleanerDraft, state.locality));
      setStep(Math.min(state.step, STEPS.length - 1));
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  const current: StepKey = STEPS[step];
  const isLast = step === PREVIEW;
  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));
  const toggle = (key: "services" | "languages", value: string) =>
    setAnswers((a) => ({ ...a, [key]: a[key].includes(value) ? a[key].filter((v) => v !== value) : [...a[key], value] }));

  const birth = birthProblem(answers.birthD, answers.birthM, answers.birthY);
  const age = ageFromParts(answers.birthD, answers.birthM, answers.birthY);
  const townName = answers.locality ? (lang === "he" ? answers.locality.name_he : answers.locality.name_en || answers.locality.name_he) : answers.loc.trim();

  function isStepValid(key: StepKey): boolean {
    switch (key) {
      case "you": return answers.name.trim().length > 0 && birth === null;
      case "where": return answers.locality != null || answers.loc.trim().length > 0;
      case "services": return answers.services.length > 0;
      default: return true;
    }
  }

  // Every Continue saves that screen first, so nothing is lost if the person leaves.
  async function goNext() {
    if (!isStepValid(current) || saving) return;
    if (isLast) {
      void handleSubmit();
      return;
    }
    const target = returnToPreview ? PREVIEW : step + 1;
    setSaving(true);
    const ok = await persist(false, target);
    setSaving(false);
    if (ok) {
      setStep(target);
      setReturnToPreview(false);
    }
  }
  function goBack() {
    if (returnToPreview) {
      setStep(PREVIEW);
      setReturnToPreview(false);
    } else if (step > 0) setStep((s) => s - 1);
  }
  function editSection(target: StepKey) {
    setError(null);
    setReturnToPreview(true);
    setStep(STEPS.indexOf(target));
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
        setError(tr("signUpFailed"));
        return false;
      }
      const ext = answers.photoFile.name.split(".").pop();
      const path = `${auth.user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, answers.photoFile, { upsert: true, contentType: answers.photoFile.type });
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

  const monthNames = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(lang === "he" ? "he" : "en", { month: "short" }).format(new Date(2020, i, 1)));
  const curYear = new Date().getFullYear();
  const inputCls = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500";
  const selectCls = "border border-gray-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const h2 = "text-lg font-semibold text-gray-900";
  const sub = "text-sm text-gray-500 mt-1 mb-5";
  const label = "block text-sm font-medium text-gray-800 mb-1.5";

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-500">{tr("settingUp")}</p>
      </div>
    );
  }

  if (phase === "congrats") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow p-8 text-center flex flex-col items-center gap-3">
          <div className="text-4xl">✅</div>
          <p className="text-lg font-semibold text-gray-900">{tr("congratsTitle")}</p>
          <p className="text-sm text-gray-600">{tr("congratsBody")}</p>
          <button onClick={() => router.push("/cleaner/availability?welcome=1")} className="mt-2 bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">
            {tr("startBooking")}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "confirm") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        {loading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80"><p className="text-sm font-medium text-gray-600">{tr("settingUp")}</p></div>}
        <div className="w-full max-w-lg bg-white rounded-2xl shadow p-8 flex flex-col items-center text-center gap-4">
          <p className="text-base font-semibold text-gray-900">{tr("closeConfirmTitle")}</p>
          <p className="text-sm text-gray-600">{tr("closeConfirmBody", { n: step + 1, total: STEPS.length })}</p>
          <div className="flex gap-2 w-full mt-2">
            <button onClick={handleContinueLater} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">{tr("continueLater")}</button>
            <button onClick={() => setPhase("flow")} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">{tr("keepGoing")}</button>
          </div>
        </div>
      </div>
    );
  }

  const nextLabel = saving ? tr("saving") : isLast ? tr("submit") : returnToPreview ? tr("backToPreview") : tr("next");
  const workChoice = workChoiceOf(answers.matchTypes);
  const keepOther = answers.matchTypes.filter((m) => m === "other");
  const setWork = (c: WorkChoice) =>
    set({ matchTypes: [...(c === "either" ? ["recurring", "occasional"] : c === "regular" ? ["recurring"] : ["occasional"]), ...keepOther] });
  const serviceLabel = (value: string) => tr(CLEANER_SERVICES.find((s) => s.value === value)?.key ?? "svcOther");
  const expLabel = EXPERIENCE_RANGES.find((r) => r.value === answers.experience);
  const jobs = answers.duration
    ? answers.maxDurationNoLimit || !answers.maxDuration
      ? tr("previewJobsOpen", { min: answers.duration })
      : tr("previewJobsRange", { min: answers.duration, max: answers.maxDuration })
    : null;
  const langNames = [...answers.languages.map((l) => tr(LANGUAGE_CHIPS.find((c) => c.value === l)?.key ?? "langOther")), ...answers.languagesOther.split(",").map((l) => l.trim()).filter(Boolean)];
  // "Either is fine" is shown as the two things it means, so a host never has to guess.
  const lookingFor = workChoice === "regular" ? [tr("matchRegular")] : workChoice === "once" ? [tr("matchOnce")] : [tr("matchRegular"), tr("matchOnce")];
  const notSet = <span className="text-sm text-gray-400">{tr("previewNotSet")}</span>;

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <p className="text-sm font-medium text-gray-600">{tr("settingUp")}</p>
        </div>
      )}
      <WizardShell
        stepLabel={tr("stepOf", { n: step + 1, total: STEPS.length })}
        progress={(step + 1) / STEPS.length}
        topRight={<LanguageToggle />}
        onClose={() => setPhase("confirm")}
        closeLabel={tr("close")}
        error={error}
        back={{ label: tr("back"), onClick: goBack, hidden: step === 0 && !returnToPreview }}
        next={{ label: nextLabel, onClick: goNext, disabled: !isStepValid(current) || loading || saving }}
        skip={OPTIONAL.includes(current) && !returnToPreview ? { label: tr("skip"), onClick: goNext } : undefined}
      >
        {current === "you" && (
          <>
            <h2 className={h2}>{tr("s1Title")}</h2>
            <p className={sub}>{tr("s1Sub")}</p>
            <div className="mb-5">
              <span className={label}>{tr("qPhoto")}</span>
              <PhotoPicker
                preview={answers.photoPreview}
                onPick={(file, url) => set({ photoFile: file, photoPreview: url })}
                labels={{ camera: tr("photoTakePhoto"), library: tr("photoCameraRoll"), computer: tr("photoChooseComputer") }}
              />
              <p className="text-xs text-gray-500 mt-2">{tr("photoTip")}</p>
            </div>
            <div className="mb-5">
              <label htmlFor="c-name" className={label}>{tr("qName")}</label>
              <input id="c-name" type="text" value={answers.name} onChange={(e) => set({ name: e.target.value })} onBlur={() => setNameTouched(true)} placeholder={tr("phName")} className={inputCls} />
              {nameTouched && answers.name.trim() === "" && <p className="text-sm text-red-600 mt-1">{tr("errName")}</p>}
            </div>
            <div>
              <span className={label}>{tr("qBirth")}</span>
              <div className="flex gap-2">
                <select aria-label={tr("dayLabel")} value={answers.birthD} onChange={(e) => set({ birthD: e.target.value })} className={`flex-1 ${selectCls}`}>
                  <option value="">{tr("dayLabel")}</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select aria-label={tr("monthLabel")} value={answers.birthM} onChange={(e) => set({ birthM: e.target.value })} className={`flex-[1.5] ${selectCls}`}>
                  <option value="">{tr("monthLabel")}</option>
                  {monthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                </select>
                <select aria-label={tr("yearLabel")} value={answers.birthY} onChange={(e) => set({ birthY: e.target.value })} className={`flex-[1.2] ${selectCls}`}>
                  <option value="">{tr("yearLabel")}</option>
                  {Array.from({ length: 101 }, (_, i) => curYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-2">{tr("birthSub")}</p>
              {birth === "invalid" && <p className="text-sm text-red-600 mt-1">{tr("errBirth")}</p>}
              {birth === "tooYoung" && <p className="text-sm text-red-600 mt-1">{tr("errTooYoung")}</p>}
              {birth === null && age !== null && <p className="text-sm text-gray-500 mt-1">{tr("ageOut", { age })}</p>}
              {birth === null && age !== null && age < 18 && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mt-2">{tr("minorNotice")}</p>}
            </div>
          </>
        )}

        {current === "where" && (
          <>
            <h2 className={h2}>{tr("s2Title")}</h2>
            <p className={sub}>{tr("s2Sub")}</p>
            <LocalityPicker lang={lang === "he" ? "he" : "en"} value={answers.locality} onChange={(l) => set({ locality: l })} autoFocus />
            {!answers.locality && (
              <div className="mt-3">
                {answers.locManual ? (
                  <input type="text" value={answers.loc} onChange={(e) => set({ loc: e.target.value })} placeholder={tr("phLoc")} className={inputCls} />
                ) : (
                  <button type="button" onClick={() => set({ locManual: true })} className="text-sm text-gray-500 underline">{tr("locManual")}</button>
                )}
              </div>
            )}
          </>
        )}

        {current === "getting" && (
          <>
            <h2 className={h2}>{tr("s3Title")}</h2>
            <p className={sub}>{tr("s3Sub")}</p>
            <p className="text-center text-3xl font-bold text-blue-600 mb-1">{tr("radiusValue", { n: answers.radius })}</p>
            <input type="range" min={1} max={50} step={1} value={answers.radius} onChange={(e) => set({ radius: e.target.value })} aria-label={tr("qRadius")} className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>50</span></div>
            <p className="text-sm text-gray-600 mt-3">{townName ? tr("radiusSentence", { n: answers.radius, town: townName }) : tr("radiusSentenceNoTown", { n: answers.radius })}</p>

            <div className="mt-6">
              <span className={label}>{tr("qCar")}</span>
              <div className="grid grid-cols-2 gap-2">
                {(["yes", "no"] as const).map((v) => (
                  <OptionCard key={v} selected={answers.car === v} onClick={() => set({ car: v, ...(v === "no" ? { gas: null } : {}) })} title={tr(v)} />
                ))}
              </div>
            </div>
            {answers.car === "yes" && (
              <div className="mt-5">
                <span className={label}>{tr("qGas")}</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["yes", "no"] as const).map((v) => (
                    <OptionCard key={v} selected={answers.gas === v} onClick={() => set({ gas: v })} title={tr(v)} />
                  ))}
                </div>
              </div>
            )}
            {answers.car === "yes" && answers.gas === "yes" && (
              <div className="mt-5">
                <label htmlFor="c-gas" className={label}>{tr("qGasRate")}</label>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-medium">₪</span>
                  <input id="c-gas" type="number" step="0.01" inputMode="decimal" value={fmt2(answers.gasAmt)} onChange={(e) => set({ gasAmt: e.target.value })} className="w-24 border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-sm text-gray-500">{tr("perKm")}</span>
                </div>
              </div>
            )}
          </>
        )}

        {current === "services" && (
          <>
            <h2 className={h2}>{tr("s4Title")}</h2>
            <p className={sub}>{tr("s4Sub")}</p>
            {SERVICE_GROUPS.map((g) => (
              <div key={g.group} className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{tr(g.key)}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {CLEANER_SERVICES.filter((s) => s.group === g.group).map((s) => (
                    <Chip key={s.value} selected={answers.services.includes(s.value)} onClick={() => toggle("services", s.value)}>{tr(s.key)}</Chip>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-1.5 flex-wrap">
              <Chip selected={answers.services.includes("Other")} onClick={() => toggle("services", "Other")}>{tr("svcOther")}</Chip>
            </div>
            {answers.services.includes("Other") && (
              <input type="text" value={answers.serviceOtherText} onChange={(e) => set({ serviceOtherText: e.target.value })} placeholder={tr("servicesOtherPh")} className={`${inputCls} mt-3`} />
            )}
          </>
        )}

        {current === "rate" && (
          <>
            <h2 className={h2}>{tr("s5Title")}</h2>
            <p className={sub}>{tr("s5Sub")}</p>
            <label htmlFor="c-rate" className={label}>{tr("qRate")}</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">₪</span>
              <input id="c-rate" type="number" inputMode="decimal" value={answers.rate} onChange={(e) => set({ rate: e.target.value })} className="w-28 border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-sm text-gray-500">/ {tr("perHour")}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">{tr("rateHint")}</p>
            <div className="mt-6">
              <span className={label}>{tr("qDuration")}</span>
              <Stepper value={answers.duration} onChange={(v) => set({ duration: v })} min={0.5} max={12} step={0.5} label={tr("qDuration")} suffix={tr("hrs")} />
            </div>
            <div className="mt-6">
              <span className={label}>{tr("qMaxDuration")}</span>
              <div className="flex items-center gap-3 flex-wrap">
                {!answers.maxDurationNoLimit && <Stepper value={answers.maxDuration} onChange={(v) => set({ maxDuration: v })} min={0.5} max={12} step={0.5} label={tr("qMaxDuration")} suffix={tr("hrs")} />}
                <Chip selected={answers.maxDurationNoLimit} onClick={() => set({ maxDurationNoLimit: !answers.maxDurationNoLimit })}>{tr("noLimit")}</Chip>
              </div>
              <p className="text-xs text-gray-500 mt-3">{tr("qMaxDurationNote")}</p>
            </div>
          </>
        )}

        {current === "experience" && (
          <>
            <h2 className={h2}>{tr("s6Title")}</h2>
            <p className={sub}>{tr("s6Sub")}</p>
            <span className={label}>{tr("qExperience")}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXPERIENCE_RANGES.map((r) => (
                <OptionCard key={r.value} selected={answers.experience === r.value} onClick={() => set({ experience: answers.experience === r.value ? null : r.value })} title={tr(r.key)} />
              ))}
            </div>
            <div className="mt-6">
              <span className={label}>{tr("qLanguages")}</span>
              <div className="flex gap-1.5 flex-wrap">
                {LANGUAGE_CHIPS.map((l) => (
                  <Chip key={l.value} selected={answers.languages.includes(l.value)} onClick={() => toggle("languages", l.value)}>{tr(l.key)}</Chip>
                ))}
              </div>
              <input type="text" value={answers.languagesOther} onChange={(e) => set({ languagesOther: e.target.value })} placeholder={tr("langOtherPh")} aria-label={tr("langOther")} className={`${inputCls} mt-3 text-sm`} />
            </div>
          </>
        )}

        {current === "prefer" && (
          <>
            <h2 className={h2}>{tr("s7Title")}</h2>
            <p className={sub}>{tr("s7Sub")}</p>
            <div className="flex flex-col gap-2">
              <OptionCard selected={workChoice === "regular"} onClick={() => setWork("regular")} title={tr("matchRegular")} />
              <OptionCard selected={workChoice === "once"} onClick={() => setWork("once")} title={tr("matchOnce")} />
              <OptionCard selected={workChoice === "either"} onClick={() => setWork("either")} title={tr("matchEither")} hint={`${tr("matchRegular")} · ${tr("matchOnce")}`} />
            </div>
          </>
        )}

        {current === "about" && (
          <>
            <h2 className={h2}>{tr("s8Title")}</h2>
            <p className={sub}>{tr("s8Sub")}</p>
            <GuidedAbout
              value={answers.bio}
              onChange={(v) => set({ bio: v })}
              boxLabel={tr("aboutBox")}
              rebuildLabel={tr("aboutRebuild")}
              prompts={[
                { label: tr("aboutP1"), starters: [tr("aboutP1a"), tr("aboutP1b"), tr("aboutP1c")] },
                { label: tr("aboutP2"), starters: [tr("aboutP2a"), tr("aboutP2b"), tr("aboutP2c")] },
                { label: tr("aboutP3"), starters: [tr("aboutP3a"), tr("aboutP3b"), tr("aboutP3c")] },
              ]}
            />
          </>
        )}

        {current === "preview" && (
          <>
            <h2 className={h2}>{tr("s9Title")}</h2>
            <p className={sub}>{tr("s9Sub")}</p>
            <PreviewSection editLabel={tr("edit")} onEdit={() => editSection("you")}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-xl text-gray-400 shrink-0">
                  {answers.photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={answers.photoPreview} alt="" className="w-full h-full object-cover" />
                  ) : "📷"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{age !== null && birth === null ? tr("previewAge", { name: answers.name, age }) : answers.name}</p>
                  {!answers.photoPreview && <p className="text-xs text-gray-400">{tr("previewNoPhoto")}</p>}
                  <p className="text-sm text-gray-600">{answers.rate ? tr("previewRate", { n: answers.rate }) : ""}</p>
                </div>
              </div>
            </PreviewSection>
            <PreviewSection title={tr("s2Title")} editLabel={tr("edit")} onEdit={() => editSection("where")}>
              <p className="text-sm text-gray-800">📍 {townName || notSet}</p>
            </PreviewSection>
            <PreviewSection title={tr("previewTravel")} editLabel={tr("edit")} onEdit={() => editSection("getting")}>
              <p className="text-sm text-gray-800">{tr("radiusValue", { n: answers.radius })}</p>
              {answers.car === "yes" && answers.gas === "yes" && <p className="text-sm text-gray-600">{tr("previewFuel", { n: fmt2(answers.gasAmt) })}</p>}
            </PreviewSection>
            <PreviewSection title={tr("previewServices")} editLabel={tr("edit")} onEdit={() => editSection("services")}>
              <div className="flex gap-1.5 flex-wrap">
                {answers.services.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-700">{s === "Other" ? answers.serviceOtherText || serviceLabel(s) : serviceLabel(s)}</span>
                ))}
              </div>
            </PreviewSection>
            <PreviewSection title={tr("previewJobs")} editLabel={tr("edit")} onEdit={() => editSection("rate")}>
              <p className="text-sm text-gray-800">{jobs ?? notSet}</p>
            </PreviewSection>
            <PreviewSection title={tr("previewFacts")} editLabel={tr("edit")} onEdit={() => editSection("experience")}>
              <p className="text-sm text-gray-800">{expLabel ? tr(expLabel.key) : notSet}</p>
              {langNames.length > 0 && <p className="text-sm text-gray-600">{tr("previewLanguages")}: {langNames.join(", ")}</p>}
            </PreviewSection>
            <PreviewSection title={tr("previewLooking")} editLabel={tr("edit")} onEdit={() => editSection("prefer")}>
              <ul className="text-sm text-gray-800 space-y-0.5">{lookingFor.map((l) => <li key={l}>{l}</li>)}</ul>
            </PreviewSection>
            <PreviewSection title={tr("previewAbout")} editLabel={tr("edit")} onEdit={() => editSection("about")}>
              <p className="text-sm text-gray-800 whitespace-pre-line">{answers.bio || notSet}</p>
            </PreviewSection>
            <p className="text-xs text-gray-500 mt-4">{tr("previewNextDays")}</p>
          </>
        )}
      </WizardShell>
    </>
  );
}
