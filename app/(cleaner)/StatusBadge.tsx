import { getCleanerStatus } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { t } from "@/lib/lang";
import type { Lang, TranslationKey } from "@/lib/lang";

const STATUS_COLOR: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-600",
};

const STATUS_KEY: Record<string, TranslationKey> = {
  approved: "status_approved",
  pending: "status_pending",
  rejected: "status_rejected",
  suspended: "status_suspended",
};

export async function StatusBadge({ userId }: { userId: string }) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value === "he" ? "he" : "en") as Lang;
  const status = await getCleanerStatus(userId);
  if (!status) return null;
  return (
    <span
      className={`hidden lg:inline text-xs font-medium px-2 py-0.5 rounded-full ${
        STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {t(lang, STATUS_KEY[status] ?? "status_pending")}
    </span>
  );
}
