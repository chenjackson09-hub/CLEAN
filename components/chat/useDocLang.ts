"use client";

import { useEffect, useState } from "react";

// The chat lives in both the cleaner and customer layouts (two separate i18n
// systems), so like HelpWidget it reads the language off
// `document.documentElement.dir` (both keep it in sync; rtl => Hebrew).
export function useDocLang(): "en" | "he" {
  const [lang, setLang] = useState<"en" | "he">("en");
  useEffect(() => {
    const read = () => setLang(document.documentElement.dir === "rtl" ? "he" : "en");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    return () => obs.disconnect();
  }, []);
  return lang;
}
