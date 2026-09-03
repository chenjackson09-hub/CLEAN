-- ============================================================================
-- 0022_availability_note.sql
--
-- Lets a cleaner attach a short optional note to a specific-date availability
-- slot when adding it — e.g. "half day only" or something general to flag to
-- hosts before they book. Nullable; existing rows are unaffected. Apply by
-- hand in the Supabase SQL Editor.
-- ============================================================================

alter table public.cleaner_availability add column if not exists note text;

NOTIFY pgrst, 'reload schema';
