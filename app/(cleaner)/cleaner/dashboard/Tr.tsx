"use client";

import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";

// Renders a translated string from the client language context, so it switches
// language instantly without waiting for a server re-render.
export default function Tr({ k }: { k: TranslationKey }) {
  const { t } = useLang();
  return <>{t(k)}</>;
}
