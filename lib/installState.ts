"use client";

import { useCallback, useEffect, useState } from "react";
import { isAndroidDevice, isIosDevice } from "@/lib/pwa";

// One shared place that knows whether Cindy can be installed on this phone. Several parts of the
// app need it (the install card, the account-menu item, the welcome screen), and the browser fires
// its "you can install this" event only ONCE, so the event is caught here, at import time, and
// kept for whoever asks.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep the browser's own banner away; we show ours
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

/** Test helper: forget any caught install event. */
export function resetInstallStateForTests() {
  deferred = null;
  installed = false;
  emit();
}

/** Ask the install card (always mounted in the signed-in layouts) to start the install steps. */
export const OPEN_GUIDE_EVENT = "cindy:open-install-guide";
export function openInstallGuide() {
  window.dispatchEvent(new Event(OPEN_GUIDE_EVENT));
}

export function useInstall() {
  // Read the phone's details only after mounting, so the server and the browser render the same thing first.
  const [env, setEnv] = useState({ ready: false, standalone: false, ios: false, android: false });
  const [, bump] = useState(0);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ua = navigator.userAgent;
    setEnv({ ready: true, standalone, ios: isIosDevice(ua, navigator.maxTouchPoints ?? 0), android: isAndroidDevice(ua) });
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  /** Android/Chrome: shows the browser's real install dialog. Resolves to what the person chose. */
  const promptInstall = useCallback(async () => {
    const ev = deferred;
    if (!ev) return null;
    await ev.prompt();
    const choice = await ev.userChoice;
    deferred = null;
    emit();
    return choice.outcome;
  }, []);

  return { ...env, canPrompt: deferred !== null, installed, promptInstall };
}
