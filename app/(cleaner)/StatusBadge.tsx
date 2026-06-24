import { getCleanerStatus } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { t } from "@/lib/lang";
import type { Lang, TranslationKey } from "@/lib/lang";

const STATUS_COLOR: Record<string, string> = {
  new: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  in_training: "bg-blue-100 text-blue-700",
  inactive: "bg-gray-100 text-gray-600",
  blocked: "bg-red-100 text-red-700",
};

const STATUS_KEY: Record<string, TranslationKey> = {
  new: "status_new",
  active: "status_active",
  in_training: "status_in_training",
  inactive: "status_inactive",
  blocked: "status_blocked",
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
      {t(lang, STATUS_KEY[status] ?? "status_new")}
    </span>
  );
}
