-- Onboarding overhaul, phase 4: the cleaner wizard asks "how long have you been cleaning?" as
-- five ranges instead of a number of years. The range is stored as-is (so "1–3 years" stays
-- "1–3 years" and is never turned into a made-up exact figure). years_experience is still
-- written (as the range's lower bound) so sorting and older screens keep working.
--
-- Additive and nullable: nothing breaks if this has not been applied yet - the wizard saves
-- the range in its own best-effort write and every screen that shows it reads it separately.

alter table public.cleaners
  add column if not exists experience_range text
  check (experience_range is null or experience_range in ('new', 'under1', '1_3', '3_5', '5plus'));

notify pgrst, 'reload schema';
