"use client";

import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";
import DateBlock from "../../dashboard/DateBlock";

const MONTH_KEYS: TranslationKey[] = [
  "month_jan", "month_feb", "month_mar", "month_apr", "month_may", "month_jun",
  "month_jul", "month_aug", "month_sep", "month_oct", "month_nov", "month_dec",
];

// Renders the dashboard's calendar-style date cube for a "YYYY-MM-DD" date,
// translating the month via the cleaner language context (this page is otherwise
// a server component, so the cube lives in its own client component).
export default function DateCube({ date }: { date: string }) {
  const { t } = useLang();
  const [, mm, dd] = date.split("-");
  return <DateBlock day={parseInt(dd)} month={t(MONTH_KEYS[parseInt(mm) - 1])} />;
}
