-- ============================================================================
-- 0047_job_length_quarter_hours.sql
--
-- A cleaner's shortest / longest job can be any multiple of 15 minutes
-- (0.25 h), but never shorter than 30 minutes (0.5 h): 30 min, 45 min, 1 h,
-- 1 h 15 min ... Both columns are numeric(4,2) since migration 0046.
-- Existing values (whole and half hours) already satisfy this.
--
-- Apply by hand in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================================

alter table public.cleaners drop constraint if exists cleaners_min_hours_check;
alter table public.cleaners add constraint cleaners_min_hours_check
  check (min_hours is null or (min_hours >= 0.5 and (min_hours * 4) = round(min_hours * 4)));

alter table public.cleaners drop constraint if exists cleaners_max_hours_check;
alter table public.cleaners add constraint cleaners_max_hours_check
  check (max_hours is null or (max_hours >= 0.5 and (max_hours * 4) = round(max_hours * 4)));

NOTIFY pgrst, 'reload schema';
