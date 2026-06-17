"use client";

import { useLang } from "@/context/LangContext";

export default function AvailabilityHeader() {
  const { t } = useLang();
  return (
    <div className="px-6 pt-6 pb-3 border-b border-gray-100 w-full md:w-[45vw] md:mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("avail_title")}</h1>
      <p className="text-base text-gray-500">{t("avail_subtitle")}</p>
    </div>
  );
}
