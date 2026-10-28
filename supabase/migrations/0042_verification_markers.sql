-- Onboarding overhaul, phase 2: three small, additive markers. Nothing is dropped and no
-- existing sign-in or page changes behaviour.
--
--   cleaners / customers .cindy_verified_at, .cindy_verified_by
--       "Cindy Verified": set ONLY when an admin explicitly verifies a person (it can be
--       long after they started using the app). Never set automatically. NULL = not verified.
--
--   profiles.onboarding_completed_at
--       When the person finished (submitted) their sign-up wizard. Used from phase 3 so the
--       admin sees only finished sign-ups. Every account that exists today is backfilled as
--       completed, so nothing disappears from admin screens.
--
--   profiles.is_test_account
--       True for every account while Cindy is in smoke testing (default true). At launch the
--       default is switched to false; test accounts can be told apart from real ones, and a
--       test account's data is never treated as verified real-user data.
-- Apply by hand in the Supabase SQL Editor.

alter table public.cleaners
  add column if not exists cindy_verified_at timestamptz,
  add column if not exists cindy_verified_by uuid references public.profiles(id) on delete set null;

alter table public.customers
  add column if not exists cindy_verified_at timestamptz,
  add column if not exists cindy_verified_by uuid references public.profiles(id) on delete set null;

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists is_test_account boolean not null default true;

-- Everyone who exists today has already been through sign-up.
update public.profiles
set onboarding_completed_at = coalesce(created_at, now())
where onboarding_completed_at is null;

create index if not exists cleaners_cindy_verified_idx on public.cleaners (cindy_verified_at) where cindy_verified_at is not null;
create index if not exists customers_cindy_verified_idx on public.customers (cindy_verified_at) where cindy_verified_at is not null;

notify pgrst, 'reload schema';
