// Product switches that are off for now but kept in the code so they can come back.

// Cleaner photo gallery ("photos of past work"). Switched off while the app is in smoke
// testing — the gallery is neither shown on the public profile nor managed in the
// cleaner's own profile. The profile PICTURE is unaffected.
export const GALLERY_ENABLED = false

// A cleaner is only SHOWN to hosts once they are "listed": a profile photo, an hourly rate and
// at least one available day (the availability part is what the schedule already needs). Set to
// false to show every approved cleaner again, whatever their profile is missing.
export const REQUIRE_LISTING_CHECKLIST = true
