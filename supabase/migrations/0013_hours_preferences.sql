-- ============================================================================
-- 0013_hours_preferences.sql
--
-- Hours preferences:
--   * cleaners.min_hours  — fewest hours a cleaner will accept a clean for
--   * cleaners.max_hours  — most hours a cleaner will accept
--   * customers.max_hours — most hours a customer is willing to pay for
--
-- All nullable (unset = no preference). Stored only for now (not yet enforced in
-- booking/browse). Apply by hand in the Supabase SQL Editor.
-- ============================================================================

alter table public.cleaners  add column if not exists min_hours int check (min_hours is null or min_hours >= 1);
alter table public.cleaners  add column if not exists max_hours int check (max_hours is null or max_hours >= 1);
alter table public.customers add column if not exists max_hours int check (max_hours is null or max_hours >= 1);

NOTIFY pgrst, 'reload schema';
