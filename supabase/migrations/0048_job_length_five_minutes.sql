-- ============================================================================
-- 0048_job_length_five_minutes.sql
--
-- A cleaner's shortest / longest job can be any multiple of 5 minutes, never
-- shorter than 20 minutes (20, 25, 30, 35, 40, 45 min, 1 h, 1 h 5 min ...).
-- Replaces the quarter-hour rule from 0047.
--
-- The columns hold hours as numeric(4,2), so 20 minutes is stored as 0.33 and
-- 25 minutes as 0.42. The check works in minutes and allows for that
-- 2-decimal rounding (at most 0.3 minute). Existing values (whole, half and
-- quarter hours) already satisfy it.
--
-- Apply by hand in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================================

alter table public.cleaners drop constraint if exists cleaners_min_hours_check;
alter table public.cleaners add constraint cleaners_min_hours_check
  check (
    min_hours is null or (
      round(min_hours * 60 / 5) * 5 >= 20
      and abs(min_hours * 60 - round(min_hours * 60 / 5) * 5) <= 0.5
    )
  );

alter table public.cleaners drop constraint if exists cleaners_max_hours_check;
alter table public.cleaners add constraint cleaners_max_hours_check
  check (
    max_hours is null or (
      round(max_hours * 60 / 5) * 5 >= 20
      and abs(max_hours * 60 - round(max_hours * 60 / 5) * 5) <= 0.5
    )
  );

NOTIFY pgrst, 'reload schema';
