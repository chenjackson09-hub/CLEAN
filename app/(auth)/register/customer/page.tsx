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
import { HOME_TYPE_CHOICES, LANGUAGE_CHIPS } from "@/lib/onboarding/options";
import type { CustomerDraft } from "@/lib/onboarding/customer";
import { ROLE_HOME } from "@/lib/roleHome";

type Answers = {
  // Photos already saved to the account; `photoFile` / `petPhotoFile` are NEW picks not yet uploaded.
  avatarUrl: string | null;
  petPhotoUrl: string | null;
  photoFile: File | null;
  photoPreview: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  languages: string[];
  languagesOther: string;
  aboutMe: string;
  area: string;
  // The official locality picked from the list (preferred over the typed `area`).
  locality: PickedLocality | null;
  areaManual: boolean;
  homeType: CustomerDraft["homeType"];
  bedrooms: string;
  bathrooms: string;
  numFloors: string;
  sizeSqm: string;
  numPeople: string;
  petTypes: string[];
  numPets: string;
  petNote: string;
  petPhotoFile: File | null;
  petPhotoPreview: string | null;
  // No longer asked at sign-up (they belong to the request, not the profile) but kept so a
  // value saved earlier is never lost.
  frequency: CustomerDraft["frequency"];
  cleaningType: CustomerDraft["cleaningType"];
  priorities: string[];
  priorityOtherText: string;
  homeInstructions: string;
};

const initialAnswers: Answers = {
  avatarUrl: null, petPhotoUrl: null, photoFile: null, photoPreview: null,
  firstName: "", lastName: "", phone: "", languages: [], languagesOther: "", aboutMe: "",
  area: "", locality: null, areaManual: false,
  homeType: null, bedrooms: "", bathrooms: "", numFloors: "", sizeSqm: "", numPeople: "",
  petTypes: [], numPets: "", petNote: "", petPhotoFile: null, petPhotoPreview: null,
  frequency: null, cleaningType: null, priorities: [], priorityOtherText: "", homeInstructions: "",
};

const STEPS = ["about", "where", "home", "pets", "preview"] as const;
type StepKey = (typeof STEPS)[number];
const OPTIONAL: StepKey[] = ["home", "pets"];
const PREVIEW = STEPS.length - 1;
const HOME_KEYS: Record<string, string> = {
  apartment: "homeApartment", house: "homeHouse", villa: "homeVilla", guesthouse: "homeGuesthouse", office: "homeOffice", other: "homeOther",
};
const PET_TYPES: { value: string; key: string }[] = [
  { value: "dog", key: "petsDog" },
  { value: "cat", key: "petsCat" },
  { value: "other", key: "petsOther" },
];

// The wizard's answers <-> what the server saves. Only plain values cross to the server.
function answersToDraft(a: Answers, avatarUrl: string | null, petPhotoUrl: string | null): CustomerDraft {
  return {
    avatarUrl, petPhotoUrl, firstName: a.firstName, lastName: a.lastName, phone: a.phone,
    languages: a.languages, languagesOther: a.languagesOther, aboutMe: a.aboutMe,
    localityId: a.locality?.id ?? null, area: a.locality ? "" : a.area,
    homeType: a.homeType, bedrooms: a.bedrooms, bathrooms: a.bathrooms, numFloors: a.numFloors, sizeSqm: a.sizeSqm, numPeople: a.numPeople,
    petTypes: a.petTypes, numPets: a.numPets, petNote: a.petNote,
    frequency: a.frequency, cleaningType: a.cleaningType, priorities: a.priorities, priorityOtherText: a.priorityOtherText, homeInstructions: a.homeInstructions,
  };
}

function draftToAnswers(d: CustomerDraft, locality: PickedLocality | null): Answers {
  return {
    ...initialAnswers,
    avatarUrl: d.avatarUrl, photoPreview: d.avatarUrl, petPhotoUrl: d.petPhotoUrl, petPhotoPreview: d.petPhotoUrl,
    firstName: d.firstName, lastName: d.lastName, phone: d.phone, languages: d.languages, languagesOther: d.languagesOther, aboutMe: d.aboutMe,
    area: d.area, locality, areaManual: !locality && d.area !== "",
    homeType: d.homeType, bedrooms: d.bedrooms, bathrooms: d.bathrooms, numFloors: d.numFloors, sizeSqm: d.sizeSqm, numPeople: d.numPeople,
    petTypes: d.petTypes, numPets: d.numPets, petNote: d.petNote,
    frequency: d.frequency, cleaningType: d.cleaningType, priorities: d.priorities, priorityOtherText: d.priorityOtherText, homeInstructions: d.homeInstructions,
  };
}

export default function CustomerRegisterPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  // Set when a section is opened from the preview: Continue then goes straight back to it.
  const [returnToPreview, setReturnToPreview] = useState(false);
  const [phase, setPhase] = useState<"flow" | "confirm">("flow");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // False until the saved answers have been loaded (so the screen never flashes empty).
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [namesTouched, setNamesTouched] = useState(false);
  const tr = (key: string, vars?: Record<string, string | number>) => t(`auth.registerCustomer.${key}`, vars);

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
      if (state.role !== "customer") {
        router.replace(`/register/${state.role}`);
        return;
      }
      const loaded = draftToAnswers(state.draft as CustomerDraft, state.locality);
      setAnswers(loaded);
      setShowMore(!!(loaded.numFloors || loaded.sizeSqm || loaded.numPeople));
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
  const toggleLanguage = (value: string) =>
    setAnswers((a) => ({ ...a, languages: a.languages.includes(value) ? a.languages.filter((v) => v !== value) : [...a.languages, value] }));
  const hasPets = answers.petTypes.length > 0;
  const togglePet = (value: string) =>
    setAnswers((a) => ({ ...a, petTypes: a.petTypes.includes(value) ? a.petTypes.filter((v) => v !== value) : [...a.petTypes, value] }));

  // Only the two names and the town are required — everything else is optional and skippable.
  function isStepValid(key: StepKey): boolean {
    if (key === "about") return answers.firstName.trim().length > 0 && answers.lastName.trim().length > 0;
    if (key === "where") return answers.locality != null || answers.area.trim().length > 0;
    return true;
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

  // Saves everything collected so far. New photos are uploaded first (the account exists, so it
  // has its own storage folder); the server then checks and writes the answers. With `submit`
  // it also checks the required answers and marks the sign-up finished.
  async function persist(submit: boolean, nextStep: number = step): Promise<boolean> {
    setError(null);
    const supabase = createClient();
    let avatarUrl = answers.avatarUrl;
    let petPhotoUrl = answers.petPhotoUrl;
    if (answers.photoFile || answers.petPhotoFile) {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setError(tr("signUpFailed"));
        return false;
      }
      const upload = async (file: File, name: "avatar" | "pet") => {
        const ext = file.name.split(".").pop();
        const path = `${auth.user!.id}/${name}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
        if (uploadErr) return null;
        return `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      };
      if (answers.photoFile) {
        const url = await upload(answers.photoFile, "avatar");
        if (url) {
          avatarUrl = url;
          setAnswers((a) => ({ ...a, avatarUrl: url, photoFile: null, photoPreview: url }));
        }
      }
      if (answers.petPhotoFile) {
        const url = await upload(answers.petPhotoFile, "pet");
        if (url) {
          petPhotoUrl = url;
          setAnswers((a) => ({ ...a, petPhotoUrl: url, petPhotoFile: null, petPhotoPreview: url }));
        }
      }
    }
    const res = await saveOnboarding({ role: "customer", draft: answersToDraft(answers, avatarUrl, petPhotoUrl), step: nextStep, submit });
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
    if (ok) router.push("/browse");
  }

  async function handleContinueLater() {
    setLoading(true);
    const ok = await persist(false);
    // Their answers are saved — sign them out and send them to /login. Signing back in
    // resumes this wizard where they stopped.
    if (ok) await signOutToLogin();
    else setLoading(false);
  }

  const inputCls = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500";
  const h2 = "text-lg font-semibold text-gray-900";
  const sub = "text-sm text-gray-500 mt-1 mb-5";
  const label = "block text-sm font-medium text-gray-800 mb-1.5";
  const townName = answers.locality ? (lang === "he" ? answers.locality.name_he : answers.locality.name_en || answers.locality.name_he) : answers.area.trim();
  const displayName = `${answers.firstName} ${answers.lastName}`.trim();
  const langNames = [...answers.languages.map((l) => tr(LANGUAGE_CHIPS.find((c) => c.value === l)?.key ?? "langOther")), ...answers.languagesOther.split(",").map((l) => l.trim()).filter(Boolean)];
  const notSet = <span className="text-sm text-gray-400">{tr("previewNotSet")}</span>;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-500">{tr("settingUp")}</p>
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
        {current === "about" && (
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="h-first" className={label}>{tr("qFirstName")}</label>
                <input id="h-first" type="text" value={answers.firstName} onChange={(e) => set({ firstName: e.target.value })} onBlur={() => setNamesTouched(true)} placeholder={tr("phFirstName")} className={inputCls} />
              </div>
              <div>
                <label htmlFor="h-last" className={label}>{tr("qLastName")}</label>
                <input id="h-last" type="text" value={answers.lastName} onChange={(e) => set({ lastName: e.target.value })} onBlur={() => setNamesTouched(true)} placeholder={tr("phLastName")} className={inputCls} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{tr("lastNameNote")}</p>
            {namesTouched && (answers.firstName.trim() === "" || answers.lastName.trim() === "") && <p className="text-sm text-red-600 mt-1">{tr("errNames")}</p>}

            <div className="mt-5">
              <label htmlFor="h-phone" className={label}>{tr("qPhone")} <span className="text-gray-400 font-normal">({tr("optional")})</span></label>
              <input id="h-phone" type="tel" value={answers.phone} onChange={(e) => set({ phone: e.target.value })} placeholder={tr("phPhone")} className={inputCls} />
              <p className="text-xs text-gray-500 mt-1.5">{tr("phoneNote")}</p>
            </div>

            <div className="mt-5">
              <span className={label}>{tr("qLanguages")}</span>
              <div className="flex gap-1.5 flex-wrap">
                {LANGUAGE_CHIPS.map((l) => (
                  <Chip key={l.value} selected={answers.languages.includes(l.value)} onClick={() => toggleLanguage(l.value)}>{tr(l.key)}</Chip>
                ))}
              </div>
              <input type="text" value={answers.languagesOther} onChange={(e) => set({ languagesOther: e.target.value })} placeholder={tr("langOtherPh")} aria-label={tr("langOther")} className={`${inputCls} mt-3 text-sm`} />
            </div>

            <div className="mt-5">
              <GuidedAbout
                value={answers.aboutMe}
                onChange={(v) => set({ aboutMe: v })}
                boxLabel={tr("qAboutMe")}
                rebuildLabel=""
                prompts={[{ label: tr("qAboutMe"), starters: [tr("aboutStarter1"), tr("aboutStarter2"), tr("aboutStarter3")], placeholder: tr("aboutMePlaceholder") }]}
              />
            </div>
          </>
        )}

        {current === "where" && (
          <>
            <h2 className={h2}>{tr("s2Title")}</h2>
            <p className={sub}>{tr("s2Sub")}</p>
            <label htmlFor="h-town" className={label}>{tr("qArea")}</label>
            <LocalityPicker id="h-town" lang={lang === "he" ? "he" : "en"} value={answers.locality} onChange={(l) => set({ locality: l })} autoFocus />
            {!answers.locality && (
              <div className="mt-3">
                {answers.areaManual ? (
                  <input type="text" value={answers.area} onChange={(e) => set({ area: e.target.value })} placeholder={tr("phArea")} className={inputCls} />
                ) : (
                  <button type="button" onClick={() => set({ areaManual: true })} className="text-sm text-gray-500 underline">{tr("areaManual")}</button>
                )}
              </div>
            )}
          </>
        )}

        {current === "home" && (
          <>
            <h2 className={h2}>{tr("s3Title")}</h2>
            <p className={sub}>{tr("s3Sub")}</p>
            <span className={label}>{tr("qHomeType")}</span>
            <div className="grid grid-cols-2 gap-2">
              {HOME_TYPE_CHOICES.map((v) => (
                <OptionCard key={v} selected={answers.homeType === v} onClick={() => set({ homeType: answers.homeType === v ? null : v })} title={tr(HOME_KEYS[v])} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <span className={label}>{tr("qBedrooms")}</span>
                <Stepper value={answers.bedrooms} onChange={(v) => set({ bedrooms: v })} min={0} max={30} label={tr("qBedrooms")} />
              </div>
              <div>
                <span className={label}>{tr("qBathrooms")}</span>
                <Stepper value={answers.bathrooms} onChange={(v) => set({ bathrooms: v })} min={0} max={30} label={tr("qBathrooms")} />
              </div>
            </div>
            <button type="button" onClick={() => setShowMore((s) => !s)} aria-expanded={showMore} className="text-sm text-blue-600 underline mt-6">
              {tr("moreDetails")}
            </button>
            {showMore && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <label htmlFor="h-floors" className="block text-xs font-medium text-gray-700 mb-1">{tr("qFloors")}</label>
                  <input id="h-floors" type="number" inputMode="numeric" min={0} value={answers.numFloors} onChange={(e) => set({ numFloors: e.target.value })} className="w-full border border-gray-300 rounded-xl px-2 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="h-size" className="block text-xs font-medium text-gray-700 mb-1">{tr("qSize")}</label>
                  <input id="h-size" type="number" inputMode="numeric" min={0} value={answers.sizeSqm} onChange={(e) => set({ sizeSqm: e.target.value })} className="w-full border border-gray-300 rounded-xl px-2 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="h-people" className="block text-xs font-medium text-gray-700 mb-1">{tr("qPeople")}</label>
                  <input id="h-people" type="number" inputMode="numeric" min={0} value={answers.numPeople} onChange={(e) => set({ numPeople: e.target.value })} className="w-full border border-gray-300 rounded-xl px-2 py-2 text-sm" />
                </div>
              </div>
            )}
          </>
        )}

        {current === "pets" && (
          <>
            <h2 className={h2}>{tr("s4Title")}</h2>
            <p className={sub}>{tr("s4Sub")}</p>
            <div className="grid grid-cols-2 gap-2">
              <OptionCard selected={!hasPets} onClick={() => set({ petTypes: [], numPets: "", petNote: "", petPhotoFile: null, petPhotoPreview: null, petPhotoUrl: null })} title={tr("petsNone")} />
              {PET_TYPES.map((p) => (
                <OptionCard key={p.value} selected={answers.petTypes.includes(p.value)} onClick={() => togglePet(p.value)} title={tr(p.key)} />
              ))}
            </div>
            {hasPets && (
              <div className="mt-6 space-y-5">
                <div>
                  <span className={label}>{tr("qNumPets")}</span>
                  <Stepper value={answers.numPets} onChange={(v) => set({ numPets: v })} min={1} max={30} label={tr("qNumPets")} />
                </div>
                <div>
                  <label htmlFor="h-petnote" className={label}>{tr("qPetNote")}</label>
                  <textarea id="h-petnote" rows={2} value={answers.petNote} onChange={(e) => set({ petNote: e.target.value })} placeholder={tr("petNotePlaceholder")} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <span className={label}>{tr("qPetPhoto")}</span>
                  <PhotoPicker
                    preview={answers.petPhotoPreview}
                    onPick={(file, url) => set({ petPhotoFile: file, petPhotoPreview: url })}
                    labels={{ camera: tr("photoTakePhoto"), library: tr("photoCameraRoll"), computer: tr("photoChooseComputer") }}
                    sizeClass="w-20 h-20"
                    fallback="🐾"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {current === "preview" && (
          <>
            <h2 className={h2}>{tr("s5Title")}</h2>
            <p className={sub}>{tr("s5Sub")}</p>
            <PreviewSection editLabel={tr("edit")} onEdit={() => editSection("about")}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-xl text-gray-400 shrink-0">
                  {answers.photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={answers.photoPreview} alt="" className="w-full h-full object-cover" />
                  ) : "📷"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                  {langNames.length > 0 && <p className="text-sm text-gray-600">{tr("previewLanguages")}: {langNames.join(", ")}</p>}
                </div>
              </div>
              {answers.aboutMe && <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{answers.aboutMe}</p>}
            </PreviewSection>
            <PreviewSection title={tr("previewTown")} editLabel={tr("edit")} onEdit={() => editSection("where")}>
              <p className="text-sm text-gray-800">📍 {townName || notSet}</p>
            </PreviewSection>
            <PreviewSection title={tr("previewHome")} editLabel={tr("edit")} onEdit={() => editSection("home")}>
              {answers.homeType || answers.bedrooms || answers.bathrooms ? (
                <p className="text-sm text-gray-800">
                  {[answers.homeType ? tr(HOME_KEYS[answers.homeType] ?? "homeOther") : null, answers.bedrooms || answers.bathrooms ? tr("previewBedsBaths", { beds: answers.bedrooms || "–", baths: answers.bathrooms || "–" }) : null].filter(Boolean).join(" · ")}
                </p>
              ) : notSet}
            </PreviewSection>
            <PreviewSection title={tr("previewPets")} editLabel={tr("edit")} onEdit={() => editSection("pets")}>
              <p className="text-sm text-gray-800">
                {hasPets ? answers.petTypes.map((p) => tr(PET_TYPES.find((x) => x.value === p)?.key ?? "petsOther")).join(", ") : tr("previewNoPets")}
              </p>
              {hasPets && answers.petNote && <p className="text-sm text-gray-600">{answers.petNote}</p>}
            </PreviewSection>
            <p className="text-xs text-gray-500 mt-4">{tr("previewNote")}</p>
          </>
        )}
      </WizardShell>
    </>
  );
}
