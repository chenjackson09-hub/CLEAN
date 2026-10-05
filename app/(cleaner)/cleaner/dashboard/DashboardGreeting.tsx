"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/context/LangContext";

// Time-of-day greeting word, computed entirely client-side (never guessed on
// the server) so it reflects the viewer's own local clock — mirrors the admin
// dashboard's DashboardGreeting.tsx. The name itself is known server-side and
// renders immediately; only the greeting word waits for mount, defaulting to
// a non-breaking space so the layout doesn't jump once it resolves.
export default function DashboardGreeting({ name }: { name: string }) {
  const { t } = useLang();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const greetingWord = !now
    ? " "
    : now.getHours() < 12
      ? t("dash_good_morning")
      : now.getHours() < 18
        ? t("dash_good_afternoon")
        : t("dash_good_evening");

  return (
    <div className="pt-4 mb-4">
      <p className="text-base text-gray-400">{greetingWord ? `${greetingWord},` : greetingWord}</p>
      <h1 className="text-2xl font-bold text-black mt-0.5 truncate">{name}</h1>
    </div>
  );
}
