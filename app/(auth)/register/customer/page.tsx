"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { geocodeAddress } from "@/lib/geocode";
import LocalityPicker from "@/components/LocalityPicker";
import type { PickedLocality } from "@/lib/localities/address";
import { normalizeImageToJpeg } from "@/lib/image/normalizeImage";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";
import { signOutToLogin } from "../../actions";

type HomeType = "apartment" | "house" | "guesthouse" | "other";
type Frequency = "weekly" | "twice_monthly" | "occasional" | "one_time";
type CleaningType = "regular" | "deep";

type Answers = {
  photoFile: File | null;
  photoPreview: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  languages: string;
  aboutMe: string;
  area: string;
  // The official locality picked from the list (preferred over the typed `area`).
  locality: PickedLocality | null;
  areaManual: boolean;
  homeType: HomeType | null;
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
  frequency: Frequency | null;
  cleaningType: CleaningType | null;
  priorities: string[];
  priorityOtherText: string;
  homeInstructions: string;
};

const HOME_TYPES: { value: HomeType; key: string }[] = [
  { value: "apartment", key: "homeApartment" },
  { value: "house", key: "homeHouse" },
  { value: "guesthouse", key: "homeGuesthouse" },
  { value: "other", key: "homeOther" },
];

const FREQUENCIES: { value: Frequency; key: string }[] = [
  { value: "weekly", key: "freqWeekly" },
  { value: "twice_monthly", key: "freqTwiceMonthly" },
  { value: "occasional", key: "freqOccasional" },
  { value: "one_time", key: "freqOneTime" },
];

const CLEANING_TYPES: { value: CleaningType; key: string }[] = [
  { value: "regular", key: "typeRegular" },
  { value: "deep", key: "typeDeep" },
];

const PRIORITIES: { value: string; key: string }[] = [
  { value: "kitchen", key: "priKitchen" },
  { value: "bathrooms", key: "priBathrooms" },
  { value: "floors", key: "priFloors" },
  { value: "dusting", key: "priDusting" },
  { value: "windows", key: "priWindows" },
  { value: "linens", key: "priLinens" },
  { value: "laundry", key: "priLaundry" },
  { value: "outdoor", key: "priOutdoor" },
  { value: "other", key: "priOther" },
];

const PET_TYPES: { value: string; key: string }[] = [
  { value: "dog", key: "petsDog" },
  { value: "cat", key: "petsCat" },
  { value: "other", key: "petsOther" },
];

const initialAnswers: Answers = {
  photoFile: null,
  photoPreview: null,
  firstName: "",
  lastName: "",
  phone: "",
  languages: "",
  aboutMe: "",
  area: "",
  locality: null,
  areaManual: false,
  homeType: null,
  bedrooms: "",
  bathrooms: "",
  numFloors: "",
  sizeSqm: "",
  numPeople: "",
  petTypes: [],
  numPets: "",
  petNote: "",
  petPhotoFile: null,
  petPhotoPreview: null,
  frequency: null,
  cleaningType: null,
  priorities: [],
  priorityOtherText: "",
  homeInstructions: "",
};

const STEPS = ["about", "home", "household", "preferences", "preview"] as const;
type StepKey = (typeof STEPS)[number];

export default function CustomerRegisterPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"flow" | "confirm">("flow");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const petPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem("pending_signup");
    if (!raw) {
      router.replace("/register");
      return;
    }
    setCreds(JSON.parse(raw));
  }, [router]);

  const current: StepKey = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  // Only first/last name and area are required — everything else is
  // optional and skippable, per the "keep each step short" UX rule.
  function isStepValid(key: StepKey): boolean {
    if (key === "about") return answers.firstName.trim().length > 0 && answers.lastName.trim().length > 0;
    if (key === "home") return answers.locality != null || answers.area.trim().length > 0;
    return true;
  }

  function goNext() {
    if (!isStepValid(current)) return;
    if (isLast) {
      void handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }
  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

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

  async function onPetPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const normalized = await normalizeImageToJpeg(file);
    setAnswers((a) => ({ ...a, petPhotoFile: normalized, petPhotoPreview: URL.createObjectURL(normalized) }));
  }

  function togglePetType(value: string) {
    setAnswers((a) => {
      const next = a.petTypes.includes(value) ? a.petTypes.filter((v) => v !== value) : [...a.petTypes, value];
      return { ...a, petTypes: next };
    });
  }
  function togglePriority(value: string) {
    setAnswers((a) => {
      const next = a.priorities.includes(value) ? a.priorities.filter((v) => v !== value) : [...a.priorities, value];
      return { ...a, priorities: next };
    });
  }

  // Signs up (or reuses the pending account), uploads the photo if any, and
  // upserts everything collected so far — mirrors the cleaner wizard's
  // saveAndFinish, including the "continue later" partial-save path.
  async function saveAndFinish() {
    if (!creds) return false;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: creds.email,
      password: creds.password,
      options: { data: { role: "customer" } },
    });
    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return false;
    }
    const user = signUpData.user;
    if (!user) {
      setError(t("auth.registerCustomer.signUpFailed"));
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

    let petPhotoUrl: string | undefined;
    if (answers.petPhotoFile) {
      const ext = answers.petPhotoFile.name.split(".").pop();
      const path = `${user.id}/pet.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, answers.petPhotoFile, { upsert: true, contentType: answers.petPhotoFile.type });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        petPhotoUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      }
    }

    // full_name keeps being written as "first last" so every existing reader
    // of profiles.full_name (bookings, admin lists, the cleaner's view of a
    // customer, ...) is unaffected — first_name/last_name on customers below
    // are additive, groundwork for a future "hide last name from cleaners"
    // display rule that isn't enforced anywhere yet.
    const fullName = `${answers.firstName.trim()} ${answers.lastName.trim()}`.trim();

    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: user.id,
      role: "customer",
      full_name: fullName || null,
      phone: answers.phone || null,
      ...(avatarUrl && { avatar_url: avatarUrl }),
    });
    if (profileErr) {
      setError(profileErr.message);
      setLoading(false);
      return false;
    }

    // A picked locality supplies the address text and the official coordinates;
    // typed text (the "can't find it" fallback) is geocoded as before.
    const pickedLocality = answers.locality;
    const addressText = pickedLocality ? pickedLocality.name_he : answers.area.trim();
    const location =
      pickedLocality && pickedLocality.lat != null && pickedLocality.lng != null
        ? { lat: pickedLocality.lat, lng: pickedLocality.lng }
        : addressText
          ? await geocodeAddress(addressText)
          : null;

    const languagesArr = answers.languages
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const { error: customerErr } = await supabase.from("customers").upsert({
      id: user.id,
      first_name: answers.firstName.trim() || null,
      last_name: answers.lastName.trim() || null,
      languages: languagesArr,
      bio: answers.aboutMe || null,
      address: addressText || null,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      dwelling_type: answers.homeType,
      bedrooms: answers.bedrooms ? Number(answers.bedrooms) : null,
      bathrooms: answers.bathrooms ? Number(answers.bathrooms) : null,
      num_floors: answers.numFloors ? Number(answers.numFloors) : null,
      house_size_sqm: answers.sizeSqm ? Number(answers.sizeSqm) : null,
      num_people: answers.numPeople ? Number(answers.numPeople) : null,
      pet_types: answers.petTypes,
      num_pets: answers.petTypes.length > 0 && answers.numPets ? Number(answers.numPets) : null,
      pet_note: answers.petTypes.length > 0 && answers.petNote ? answers.petNote.trim() || null : null,
      ...(petPhotoUrl && { pet_photo_url: petPhotoUrl }),
      usage_frequency: answers.frequency,
      usual_cleaning_type: answers.cleaningType,
      cleaning_priorities: answers.priorities,
      cleaning_priorities_other: answers.priorities.includes("other") ? answers.priorityOtherText || null : null,
      home_instructions: answers.homeInstructions || null,
    });
    if (customerErr) {
      setError(customerErr.message);
      setLoading(false);
      return false;
    }

    // The locality link is its own best-effort write: if migration 0039 hasn't been
    // applied the profile above has already saved, so registration never fails on it.
    if (answers.locality) {
      try {
        await supabase.from("customers").update({ locality_id: answers.locality.id }).eq("id", user.id);
      } catch {
        /* best-effort only */
      }
    }

    localStorage.removeItem("pending_signup");
    setLoading(false);
    return true;
  }

  async function handleSubmit() {
    const ok = await saveAndFinish();
    if (ok) router.push("/browse");
  }

  async function handleContinueLater() {
    const ok = await saveAndFinish();
    if (ok) await signOutToLogin();
  }

  const displayName = `${answers.firstName} ${answers.lastName}`.trim();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm font-medium text-gray-600">{t("auth.registerCustomer.settingUp")}</p>
        </div>
      )}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-8 min-h-[420px] flex flex-col">
        <div className="flex justify-end mb-3">
          <LanguageToggle />
        </div>

        {phase === "confirm" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <p className="text-base font-semibold text-gray-900">{t("auth.registerCustomer.closeConfirmTitle")}</p>
            <p className="text-sm text-gray-600">
              {t("auth.registerCustomer.closeConfirmBody", { pct: progressPct })}
            </p>
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={handleContinueLater}
                className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {t("auth.registerCustomer.continueLater")}
              </button>
              <button
                onClick={() => setPhase("flow")}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t("auth.registerCustomer.keepGoing")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
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

            <div className="flex-1 flex flex-col justify-center gap-5">
              {current === "about" && (
                <>
                  <p className="text-lg font-semibold text-gray-900">{t("auth.registerCustomer.stepAbout")}</p>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t("auth.registerCustomer.qPhoto")}</p>
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
                            {t("auth.registerCustomer.photoTakePhoto")}
                          </button>
                          <button type="button" onClick={() => handlePhotoPick("library")} className="w-full text-start px-4 py-2.5 text-sm hover:bg-gray-50">
                            {t("auth.registerCustomer.photoCameraRoll")}
                          </button>
                          <button type="button" onClick={() => handlePhotoPick("computer")} className="w-full text-start px-4 py-2.5 text-sm hover:bg-gray-50">
                            {t("auth.registerCustomer.photoChooseComputer")}
                          </button>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t("auth.registerCustomer.photoTip")}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qFirstName")}</label>
                      <input
                        id="firstName"
                        type="text"
                        autoFocus
                        value={answers.firstName}
                        onChange={(e) => setAnswers((a) => ({ ...a, firstName: e.target.value }))}
                        placeholder={t("auth.registerCustomer.phFirstName")}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qLastName")}</label>
                      <input
                        id="lastName"
                        type="text"
                        value={answers.lastName}
                        onChange={(e) => setAnswers((a) => ({ ...a, lastName: e.target.value }))}
                        placeholder={t("auth.registerCustomer.phLastName")}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 -mt-3">{t("auth.registerCustomer.lastNameNote")}</p>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qPhone")}</label>
                    <input
                      id="phone"
                      type="tel"
                      value={answers.phone}
                      onChange={(e) => setAnswers((a) => ({ ...a, phone: e.target.value }))}
                      placeholder={t("auth.registerCustomer.phPhone")}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t("auth.registerCustomer.phoneNote")}</p>
                  </div>

                  <div>
                    <label htmlFor="languages" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qLanguages")}</label>
                    <input
                      id="languages"
                      type="text"
                      value={answers.languages}
                      onChange={(e) => setAnswers((a) => ({ ...a, languages: e.target.value }))}
                      placeholder={t("auth.registerCustomer.phLanguages")}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="aboutMe" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qAboutMe")}</label>
                    <textarea
                      id="aboutMe"
                      rows={3}
                      value={answers.aboutMe}
                      onChange={(e) => setAnswers((a) => ({ ...a, aboutMe: e.target.value }))}
                      placeholder={t("auth.registerCustomer.aboutMePlaceholder")}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {current === "home" && (
                <>
                  <p className="text-lg font-semibold text-gray-900">{t("auth.registerCustomer.stepHome")}</p>

                  <div>
                    <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qArea")}</label>
                    <LocalityPicker
                      id="area"
                      lang={lang === "he" ? "he" : "en"}
                      value={answers.locality}
                      onChange={(l) => setAnswers((a) => ({ ...a, locality: l }))}
                      autoFocus
                    />
                    {!answers.locality && (
                      <div className="mt-2">
                        {answers.areaManual ? (
                          <input
                            type="text"
                            value={answers.area}
                            onChange={(e) => setAnswers((a) => ({ ...a, area: e.target.value }))}
                            placeholder={t("auth.registerCustomer.phArea")}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAnswers((a) => ({ ...a, areaManual: true }))}
                            className="text-xs text-gray-500 underline"
                          >
                            {t("auth.registerCustomer.areaManual")}
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{t("auth.registerCustomer.areaSub")}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t("auth.registerCustomer.qHomeType")}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {HOME_TYPES.map((h) => (
                        <button
                          key={h.value}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, homeType: h.value }))}
                          className={`px-3 py-1.5 rounded-full border text-sm ${
                            answers.homeType === h.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          {t(`auth.registerCustomer.${h.key}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qBedrooms")}</label>
                      <input
                        id="bedrooms"
                        type="number"
                        min={0}
                        value={answers.bedrooms}
                        onChange={(e) => setAnswers((a) => ({ ...a, bedrooms: e.target.value }))}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qBathrooms")}</label>
                      <input
                        id="bathrooms"
                        type="number"
                        min={0}
                        value={answers.bathrooms}
                        onChange={(e) => setAnswers((a) => ({ ...a, bathrooms: e.target.value }))}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="numFloors" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qFloors")}</label>
                      <input
                        id="numFloors"
                        type="number"
                        min={0}
                        value={answers.numFloors}
                        onChange={(e) => setAnswers((a) => ({ ...a, numFloors: e.target.value }))}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sizeSqm" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qSize")}</label>
                    <input
                      id="sizeSqm"
                      type="number"
                      min={0}
                      value={answers.sizeSqm}
                      onChange={(e) => setAnswers((a) => ({ ...a, sizeSqm: e.target.value }))}
                      className="w-32 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400">{t("auth.registerCustomer.multiHomeNote")}</p>
                </>
              )}

              {current === "household" && (
                <>
                  <p className="text-lg font-semibold text-gray-900">{t("auth.registerCustomer.stepHousehold")}</p>

                  <div>
                    <label htmlFor="numPeople" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qPeople")}</label>
                    <input
                      id="numPeople"
                      type="number"
                      min={0}
                      value={answers.numPeople}
                      onChange={(e) => setAnswers((a) => ({ ...a, numPeople: e.target.value }))}
                      className="w-32 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t("auth.registerCustomer.qPets")}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, petTypes: [], numPets: "", petNote: "", petPhotoFile: null, petPhotoPreview: null }))}
                        className={`px-3 py-1.5 rounded-full border text-sm ${
                          answers.petTypes.length === 0 ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {t("auth.registerCustomer.petsNone")}
                      </button>
                      {PET_TYPES.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => togglePetType(p.value)}
                          className={`px-3 py-1.5 rounded-full border text-sm ${
                            answers.petTypes.includes(p.value) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          {t(`auth.registerCustomer.${p.key}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {answers.petTypes.length > 0 && (
                    <>
                      <div>
                        <label htmlFor="numPets" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qNumPets")}</label>
                        <input
                          id="numPets"
                          type="number"
                          min={0}
                          value={answers.numPets}
                          onChange={(e) => setAnswers((a) => ({ ...a, numPets: e.target.value }))}
                          className="w-32 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="petNote" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qPetNote")}</label>
                        <textarea
                          id="petNote"
                          rows={2}
                          value={answers.petNote}
                          onChange={(e) => setAnswers((a) => ({ ...a, petNote: e.target.value }))}
                          placeholder={t("auth.registerCustomer.petNotePlaceholder")}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">{t("auth.registerCustomer.qPetPhoto")}</p>
                        <button
                          type="button"
                          onClick={() => petPhotoInputRef.current?.click()}
                          className="w-16 h-16 rounded-xl border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center"
                        >
                          {answers.petPhotoPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={answers.petPhotoPreview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">🐾</span>
                          )}
                        </button>
                        <input ref={petPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={onPetPhotoChange} />
                      </div>
                    </>
                  )}
                </>
              )}

              {current === "preferences" && (
                <>
                  <p className="text-lg font-semibold text-gray-900">{t("auth.registerCustomer.stepPreferences")}</p>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t("auth.registerCustomer.qFrequency")}</p>
                    <div className="flex flex-col gap-2">
                      {FREQUENCIES.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, frequency: f.value }))}
                          className={`text-start px-3.5 py-2.5 rounded-xl border text-sm ${
                            answers.frequency === f.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          {t(`auth.registerCustomer.${f.key}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t("auth.registerCustomer.qCleaningType")}</p>
                    <div className="flex gap-2">
                      {CLEANING_TYPES.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, cleaningType: c.value }))}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${
                            answers.cleaningType === c.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          {t(`auth.registerCustomer.${c.key}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qPriorities")}</p>
                    <p className="text-xs text-gray-500 mb-2">{t("auth.registerCustomer.prioritiesSub")}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => togglePriority(p.value)}
                          className={`px-3 py-1.5 rounded-full border text-sm ${
                            answers.priorities.includes(p.value) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
                          }`}
                        >
                          {t(`auth.registerCustomer.${p.key}`)}
                        </button>
                      ))}
                    </div>
                    {answers.priorities.includes("other") && (
                      <input
                        type="text"
                        value={answers.priorityOtherText}
                        onChange={(e) => setAnswers((a) => ({ ...a, priorityOtherText: e.target.value }))}
                        placeholder={t("auth.registerCustomer.priOtherPh")}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mt-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  <div>
                    <label htmlFor="homeInstructions" className="block text-sm font-medium text-gray-700 mb-1">{t("auth.registerCustomer.qInstructions")}</label>
                    <textarea
                      id="homeInstructions"
                      rows={3}
                      value={answers.homeInstructions}
                      onChange={(e) => setAnswers((a) => ({ ...a, homeInstructions: e.target.value }))}
                      placeholder={t("auth.registerCustomer.instructionsPlaceholder")}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {current === "preview" && (
                <>
                  <p className="text-lg font-semibold text-gray-900 mb-1">{t("auth.registerCustomer.previewTitle")}</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                      {answers.photoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={answers.photoPreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl text-gray-400">{displayName.charAt(0).toUpperCase() || "?"}</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">{displayName || "—"}</p>
                  </div>

                  <div className="space-y-2 text-sm bg-gray-50 rounded-xl p-4">
                    {(answers.locality || answers.area) && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">{t("auth.registerCustomer.previewArea")}</span>
                        <span className="text-gray-900 text-end">{answers.locality ? answers.locality.name_he : answers.area}</span>
                      </div>
                    )}
                    {answers.homeType && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">{t("auth.registerCustomer.previewHomeType")}</span>
                        <span className="text-gray-900">{t(`auth.registerCustomer.${HOME_TYPES.find((h) => h.value === answers.homeType)!.key}`)}</span>
                      </div>
                    )}
                    {(answers.bedrooms || answers.bathrooms) && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">{t("auth.registerCustomer.qBedrooms")}/{t("auth.registerCustomer.qBathrooms")}</span>
                        <span className="text-gray-900">
                          {t("auth.registerCustomer.previewBedsBaths", { beds: answers.bedrooms || "—", baths: answers.bathrooms || "—" })}
                        </span>
                      </div>
                    )}
                    {answers.numPeople && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">{t("auth.registerCustomer.previewHousehold")}</span>
                        <span className="text-gray-900">{t("auth.registerCustomer.previewPeople", { count: answers.numPeople })}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">{t("auth.registerCustomer.previewPets")}</span>
                      <span className="text-gray-900">
                        {answers.petTypes.length === 0
                          ? t("auth.registerCustomer.previewNoPets")
                          : answers.petTypes.map((p) => t(`auth.registerCustomer.${PET_TYPES.find((pt) => pt.value === p)!.key}`)).join(", ")}
                      </span>
                    </div>
                    {answers.cleaningType && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">{t("auth.registerCustomer.previewCleaningType")}</span>
                        <span className="text-gray-900">{t(`auth.registerCustomer.${CLEANING_TYPES.find((c) => c.value === answers.cleaningType)!.key}`)}</span>
                      </div>
                    )}
                    {answers.frequency && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">{t("auth.registerCustomer.previewFrequency")}</span>
                        <span className="text-gray-900">{t(`auth.registerCustomer.${FREQUENCIES.find((f) => f.value === answers.frequency)!.key}`)}</span>
                      </div>
                    )}
                    {answers.priorities.length > 0 && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500 shrink-0">{t("auth.registerCustomer.previewPriorities")}</span>
                        <span className="text-gray-900 text-end">
                          {answers.priorities.map((p) => (p === "other" ? answers.priorityOtherText : t(`auth.registerCustomer.${PRIORITIES.find((pr) => pr.value === p)!.key}`))).filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                type="button"
                onClick={goBack}
                className={`px-3.5 py-2 text-sm text-gray-600 hover:text-gray-900 ${step === 0 ? "invisible" : ""}`}
              >
                {t("auth.registerCustomer.back")}
              </button>
              <button
                type="button"
                disabled={!isStepValid(current) || loading}
                onClick={goNext}
                className="bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLast ? t("auth.registerCustomer.submit") : t("auth.registerCustomer.next")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
