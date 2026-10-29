"use client";

import Link from "next/link";
import { useLang } from "@/context/LangContext";
import type { ListingChecklist as Checklist } from "@/lib/listing";

// "To be listed" - hosts only see a cleaner who has a photo, a rate and an available day.
// Shown on the schedule until all three are done, then it goes away on its own.
export default function ListingChecklist({ checklist }: { checklist: Checklist }) {
  const { t } = useLang();
  if (checklist.listed) return null;
  const items = [
    { done: checklist.photo, label: t("list_photo"), href: "/cleaner/profile?edit=1" },
    { done: checklist.rate, label: t("list_rate"), href: "/cleaner/profile?edit=1" },
    { done: checklist.days, label: t("list_days"), href: null },
  ];
  return (
    <div role="status" className="mb-2 rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-sm text-amber-900">
      <p className="font-semibold">{t("list_title")}</p>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-1.5">
            <span aria-hidden>{i.done ? "✅" : "⬜"}</span>
            {i.done || !i.href ? (
              <span className={i.done ? "text-amber-900/70 line-through" : ""}>{i.label}</span>
            ) : (
              <Link href={i.href} className="underline">{i.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
