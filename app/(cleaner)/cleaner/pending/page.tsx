import { cookies } from "next/headers";
import type { Lang } from "@/lib/lang";
import { t } from "@/lib/lang";

export default function PendingApprovalPage() {
  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t(lang, "pending_title")}</h1>
        <p className="text-gray-500 text-base">{t(lang, "pending_body")}</p>
      </div>
    </div>
  );
}
