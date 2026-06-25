-- Re-tighten the cleaner_status enum to its canonical values.
--
-- The out-of-band change was NOT a column-type drift: cleaners.status is still
-- the cleaner_status enum. Instead, extra values ('active', 'new') had been
-- added to the enum itself (ALTER TYPE ... ADD VALUE), which let cleaner rows be
-- relabeled to values the app doesn't recognize and which silently hid them from
-- /browse (it filters status = 'approved'). The data has already been normalized
-- (active -> approved, new -> pending); Postgres can't drop enum values in place,
-- so this migration recreates the type with only the canonical values.
--
-- Run in the Supabase SQL Editor (or `supabase db push`). Wrapped in a
-- transaction: if step 6 fails because another column also uses cleaner_status,
-- the whole thing rolls back — convert those columns too, then re-run.

begin;

-- 1. Drop the policy that references the status column (recreated in step 5).
drop policy if exists "public read approved cleaners" on public.cleaners;

-- 2. Drop the column default before swapping the type.
alter table public.cleaners alter column status drop default;

-- 3. Rename the current (polluted) enum aside and create a clean canonical one.
alter type cleaner_status rename to cleaner_status_old;
create type cleaner_status as enum ('pending', 'approved', 'rejected', 'suspended');

-- 4. Convert the column to the new enum. Casting through text is safe because
--    every row is already 'approved' or 'pending' (both exist in the new enum).
alter table public.cleaners
  alter column status type cleaner_status
  using status::text::cleaner_status;

-- 5. Restore the default and the read policy.
alter table public.cleaners alter column status set default 'pending';
create policy "public read approved cleaners"
  on public.cleaners for select
  using (status = 'approved');

-- 6. Remove the old enum (the one that still contains 'active'/'new').
drop type cleaner_status_old;

commit;
