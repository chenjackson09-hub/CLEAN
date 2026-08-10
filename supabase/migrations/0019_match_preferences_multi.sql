-- The cleaner's "who am I looking for" question moves from a single choice
-- (recurring/occasional/both/other) to a multi-select, so a cleaner can pick
-- both recurring AND occasional directly instead of a separate "both" value,
-- and can combine either with "Other". See app/(auth)/register/cleaner and
-- app/(cleaner)/cleaner/profile.

alter table public.cleaners add column if not exists match_preferences text[] not null default '{}';

alter table public.cleaners drop constraint if exists cleaners_match_preferences_check;
alter table public.cleaners add constraint cleaners_match_preferences_check
  check (match_preferences <@ array['recurring', 'occasional', 'other']::text[]);

-- Backfill from the old single-value column before dropping it — 'both'
-- expands to both options, everything else maps 1:1.
update public.cleaners
set match_preferences = case match_preference
  when 'recurring' then array['recurring']
  when 'occasional' then array['occasional']
  when 'both' then array['recurring', 'occasional']
  when 'other' then array['other']
  else '{}'
end
where match_preference is not null;

alter table public.cleaners drop constraint if exists cleaners_match_preference_check;
alter table public.cleaners drop column if exists match_preference;

NOTIFY pgrst, 'reload schema';
