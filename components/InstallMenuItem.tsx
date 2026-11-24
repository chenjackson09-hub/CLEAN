"use client";

import { openInstallGuide, useInstall } from "@/lib/installState";

// "Install the app" in the account menu of both signed-in headers: the way back to the install
// steps after the card was dismissed (or the icon deleted). Shows only on a phone that can install
// it and never inside the installed app. Plain strings (like LegalLinks) because the host and the
// cleaner header use different translation systems.
export default function InstallMenuItem({ lang, onPress }: { lang: "en" | "he"; onPress?: () => void }) {
  const inst = useInstall();
  if (!inst.ready || inst.standalone || !(inst.ios || inst.android)) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onPress?.(); // close the menu first
        openInstallGuide();
      }}
      className="w-full flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-5 w-5 rounded" />
      {lang === "he" ? "התקנת האפליקציה" : "Install the app"}
    </button>
  );
}
