import type { TranslationKey } from "@/lib/lang";
import type { Profile, Cleaner } from "@/types/database";

// Fields tracked for the cleaner profile completeness bar, shared by the
// editable profile view (ProfileView.tsx) and the read-only preview/public
// profile (CleanerProfile.tsx) so both agree on what "complete" means.
export function computeProfileMissing(t: (k: TranslationKey) => string, cleaner: Cleaner | null, profile: Profile | null): string[] {
  const missing: string[] = [];
  if (!profile?.full_name) missing.push(t("prof_full_name"));
  if (!profile?.avatar_url) missing.push(t("prof_photo"));
  if (!cleaner?.birthdate) missing.push(t("prof_birthdate"));
  if (!cleaner?.address) missing.push(t("prof_address"));
  if (!cleaner?.cleaning_categories || cleaner.cleaning_categories.length === 0) missing.push(t("prof_service_types"));
  if (!cleaner?.match_preferences || cleaner.match_preferences.length === 0) missing.push(t("prof_match_preference"));
  if (!cleaner?.work_areas || cleaner.work_areas.length === 0) missing.push(t("prof_work_areas"));
  return missing;
}

// Each missing field (out of the 6 that have no natural default) costs an
// equal share of the remaining 80% above the 20% "account exists" floor.
export function profileCompletionPct(missingCount: number): number {
  return Math.max(20, Math.min(100, Math.round(20 + ((6 - missingCount) / 6) * 80)));
}
