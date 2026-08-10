// Fixed list of named work areas a cleaner can pick from during signup and
// profile editing. Shared so the signup wizard, profile display, and the
// database check constraint (migration 0018_cleaner_profile_v2) all agree on
// the same set. Area names are proper nouns, so they're not translated.
export const WORK_AREAS = [
  "Beit Hillel",
  "Goshrim",
  "Snir",
  "Kfar Yuval",
  "Dan",
  "Dafna",
  "Sha'ar Yeshuv",
  "Ma'ayan Baruch",
  "Kfar Giladi",
  "Kiryat Shemona",
  "Amir",
  "Sde Nehemia",
  "Kfar Blum",
  "Shamir",
  "Kfar Szold",
  "Gonen",
  "Neot Mordechai",
] as const;

export type WorkArea = (typeof WORK_AREAS)[number];
