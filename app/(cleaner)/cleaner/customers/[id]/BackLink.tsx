"use client";

import Link from "next/link";
import { useLang } from "@/context/LangContext";

export default function BackLink({ fromDashboard }: { fromDashboard: boolean }) {
  const { t } = useLang();
  const href = fromDashboard ? "/cleaner/dashboard" : "/cleaner/requests";
  const label = fromDashboard ? t("req_back_dashboard") : t("req_back_requests");

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
    >
      {label}
    </Link>
  );
}
