-- ============================================================================
-- 0046_job_length_half_hours.sql
--
-- The cleaner sign-up and profile let a cleaner choose job lengths in half-hour
-- steps, but the database still had older limits:
--   * cleaners.min_hours had to be >= 1, so 0.5 was rejected;
--   * cleaners.max_hours was a whole-number column, so 4.5 was rejected.
-- Either one made "Submit for review" / "Save" fail with a generic error.
--
-- Apply by hand in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================================

alter table public.cleaners drop constraint if exists cleaners_min_hours_check;
alter table public.cleaners add constraint cleaners_min_hours_check
  check (min_hours is null or min_hours >= 0.5);

-- Existing whole-number values are kept as they are.
alter table public.cleaners alter column max_hours type numeric(4,2);
alter table public.cleaners drop constraint if exists cleaners_max_hours_check;
alter table public.cleaners add constraint cleaners_max_hours_check
  check (max_hours is null or max_hours >= 0.5);

NOTIFY pgrst, 'reload schema';
