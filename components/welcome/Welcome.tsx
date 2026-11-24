"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AlreadyInstalledConfirm from "@/components/AlreadyInstalledConfirm";
import InstallGuide from "@/components/InstallGuide";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/lib/i18n/LanguageToggle";
import { markInstalledHere, useInstall, wasInstalledHere } from "@/lib/installState";

// The first screen at the website's address for someone who is not signed in:
//   1. a splash with the app icon (a "C" for now — it is the same picture as the home-screen icon,
//      public/icons/icon-512.png, so replacing that file changes this too) and the name,
//   2. "Welcome to Cindy!": install the app on the Home Screen (recommended) or continue online.
//      The person has to pick one.
//        - Continue online → goes to the login page. NOT remembered: the welcome screen shows again
//          on every visit to the site address (owner's choice, 2026-11-24).
//        - Install → the install steps; once done, they are told to open Cindy from the Home Screen
//          and sign up / log in THERE (on iPhone the installed app keeps its own login, separate
//          from Safari).
// Inside the installed app, for someone already signed in, and on computers this is skipped and
// goes on to /login (which sends a signed-in person to their own home). `?welcome=1` shows the
// choice screen on a computer too (for testing).
//
// The splash stays for a few seconds, then fades out (FADE_MS) before the next screen appears, so
// the change of screen is a soft one instead of a jump.
const SPLASH_BROWSER_MS = 4600; // browser: splash, then the install-or-online choice
const SPLASH_APP_MS = 3900; // installed app / signed in: splash, then on to /login
const FADE_MS = 500;

export default function Welcome({ signedIn = false }: { signedIn?: boolean }) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const inst = useInstall();
  const [phase, setPhase] = useState<"splash" | "choose" | "installed">("splash");
  const [guide, setGuide] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false); // the splash is fading out

  const { ready, standalone, ios, android, installed } = inst;
  useEffect(() => {
    if (!signedIn && !ready) return;
    const force = new URLSearchParams(window.location.search).get("welcome") === "1";
    const timers: ReturnType<typeof setTimeout>[] = [];
    // wait, fade the splash out, then do the next thing
    const after = (wait: number, next: () => void) => {
      timers.push(
        setTimeout(() => {
          setLeaving(true);
          timers.push(setTimeout(next, FADE_MS));
        }, wait),
      );
    };
    if (signedIn || standalone) {
      // already signed in, or opened from the Home Screen icon: splash, then /login
      // (which sends a signed-in person to their own home)
      after(SPLASH_APP_MS, () => router.replace("/login"));
    } else if (ios || android || force) {
      after(SPLASH_BROWSER_MS, () => {
        setPhase("choose");
        setLeaving(false);
      });
    } else {
      after(SPLASH_BROWSER_MS, () => router.replace("/login")); // computers: nothing to install
    }
    return () => timers.forEach(clearTimeout);
  }, [signedIn, ready, standalone, ios, android, router]);

  // The browser told us the install really happened (Android/Chrome).
  useEffect(() => {
    if (installed) setPhase("installed");
  }, [installed]);

  const continueOnline = () => {
    router.push("/login");
  };

  const install = async () => {
    // already went through the steps on this phone? ask first (see AlreadyInstalledConfirm)
    if (wasInstalledHere()) {
      setConfirm(true);
      return;
    }
    await startInstall();
  };
  const startInstall = async () => {
    if (inst.canPrompt) {
      const outcome = await inst.promptInstall();
      if (outcome === "accepted") setPhase("installed");
      return;
    }
    setGuide(true); // iPhone (and Android without the browser's dialog): the on-screen steps
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      {phase !== "splash" && (
        <div className="absolute top-4 end-4">
          <LanguageToggle />
        </div>
      )}

      {phase === "splash" && (
        <div
          className={`flex flex-col items-center gap-4 transition-all duration-500 ease-out motion-reduce:transition-none ${leaving ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
          aria-label="Cindy"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-512.png" alt="" className="cindy-pop h-28 w-28 rounded-[28px] shadow-lg" />
          <p className="cindy-fade text-4xl font-bold tracking-tight text-gray-900">Cindy</p>
        </div>
      )}

      {phase === "choose" && (
        <div className="cindy-rise w-full max-w-sm text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="mx-auto mb-5 h-16 w-16 rounded-2xl shadow" />
          <h1 className="text-2xl font-bold text-gray-900">{t("welcome.title")}</h1>
          <p className="mt-2 text-sm text-gray-600">{t("welcome.subtitle")}</p>

          <button
            type="button"
            onClick={install}
            className="relative mt-8 w-full rounded-2xl bg-blue-600 px-4 py-4 text-start text-white shadow hover:bg-blue-700"
          >
            <span className="block pe-24 text-base font-semibold">{t("welcome.install")}</span>
            <span className="mt-0.5 block text-xs text-blue-100">{t("welcome.installHint")}</span>
            <span className="absolute end-3 top-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-blue-700">{t("welcome.recommended")}</span>
          </button>
          <button
            type="button"
            onClick={continueOnline}
            className="mt-3 w-full rounded-2xl border border-gray-300 bg-white px-4 py-4 text-base font-semibold text-gray-800 hover:bg-gray-100"
          >
            {t("welcome.online")}
          </button>
        </div>
      )}

      {phase === "installed" && (
        <div className="cindy-rise w-full max-w-sm text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="mx-auto mb-5 h-16 w-16 rounded-2xl shadow" />
          <h1 className="text-2xl font-bold text-gray-900">{t("welcome.installedTitle")}</h1>
          <p className="mt-3 text-base text-gray-700">{t("welcome.installedBody")}</p>
          <button type="button" onClick={continueOnline} className="mt-8 text-sm text-gray-500 underline">
            {t("welcome.installedOnline")}
          </button>
        </div>
      )}

      {guide && (
        <InstallGuide
          lang={lang === "he" ? "he" : "en"}
          onClose={(finished) => {
            setGuide(false);
            if (finished) {
              markInstalledHere();
              setPhase("installed");
            }
          }}
        />
      )}
      {confirm && (
        <AlreadyInstalledConfirm
          lang={lang === "he" ? "he" : "en"}
          onNo={() => setConfirm(false)}
          onYes={() => {
            setConfirm(false);
            void startInstall();
          }}
        />
      )}
    </div>
  );
}
