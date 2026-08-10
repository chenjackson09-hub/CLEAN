-- Richer cleaner signup/profile fields, added alongside the redesigned
-- one-question-at-a-time cleaner registration flow.
--
-- Note: the unmerged WAR-FIX branch also has its own unmerged 0018 migration
-- (0018_customer_languages.sql). If that branch is merged first, this file's
-- number will need to shift — this project's migrations are hand-applied,
-- not CLI-tracked, so check `main` before running.

alter table public.cleaners add column if not exists birthdate date;

-- The redesigned signup's "minimum job length" question allows half-hour
-- steps (e.g. 3.5), but the existing cleaners.min_hours column (migration
-- 0013_hours_preferences.sql) is a plain int — widen it rather than adding a
-- second, competing "minimum hours" column. max_hours is left as-is (still
-- whole hours; not asked in the new flow).
alter table public.cleaners alter column min_hours type numeric(4,2);
alter table public.cleaners drop constraint if exists cleaners_min_hours_check;
alter table public.cleaners add constraint cleaners_min_hours_check check (min_hours is null or min_hours >= 1);

alter table public.cleaners add column if not exists weekly_clean_target integer not null default 3;
alter table public.cleaners add column if not exists weekly_clean_other text;
alter table public.cleaners add column if not exists has_car boolean;
alter table public.cleaners add column if not exists gas_return_enabled boolean not null default false;
alter table public.cleaners add column if not exists gas_return_rate numeric(6,2);
alter table public.cleaners add column if not exists match_preference text;
alter table public.cleaners add column if not exists match_preference_other text;
alter table public.cleaners add column if not exists work_areas text[] not null default '{}';

-- Deliberately NOT reusing cleaners.service_types — that column already means
-- residential/commercial and is read by the browse type filter
-- (app/(customer)/browse/page.tsx). The new signup flow's cleaning-category
-- bubbles (deep cleaning, laundry, Airbnb, ...) are a different concept and
-- get their own column so they don't collide with it.
alter table public.cleaners add column if not exists cleaning_categories text[] not null default '{}';
alter table public.cleaners add column if not exists cleaning_category_other text;

-- Sane bounds so a stray client value can't corrupt planning data.
alter table public.cleaners drop constraint if exists cleaners_weekly_clean_target_check;
alter table public.cleaners add constraint cleaners_weekly_clean_target_check
  check (weekly_clean_target >= 1 and weekly_clean_target <= 7);

alter table public.cleaners drop constraint if exists cleaners_match_preference_check;
alter table public.cleaners add constraint cleaners_match_preference_check
  check (match_preference is null or match_preference in ('recurring', 'occasional', 'both', 'other'));

alter table public.cleaners drop constraint if exists cleaners_work_areas_check;
alter table public.cleaners add constraint cleaners_work_areas_check
  check (work_areas <@ array[
    'Beit Hillel','Goshrim','Snir','Kfar Yuval','Dan','Dafna','Sha''ar Yeshuv',
    'Ma''ayan Baruch','Kfar Giladi','Kiryat Shemona','Amir','Sde Nehemia',
    'Kfar Blum','Shamir','Kfar Szold','Gonen','Neot Mordechai'
  ]::text[]);

NOTIFY pgrst, 'reload schema';
