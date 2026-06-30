-- ============================================================================
-- 0012_ratings_one_per_ratee.sql
--
-- Make a rater's rating unique per *ratee* (one editable rating per person you
-- rate), instead of per booking. If an earlier copy of 0011 created the
-- per-booking constraint, drop it and add the per-ratee one. Idempotent: safe to
-- run whether 0011 shipped the old (booking_id, rater_id) or new (rater_id,
-- ratee_id) constraint.
--
-- Apply by hand in the Supabase SQL Editor.
-- ============================================================================

-- Drop the old per-booking uniqueness if it's there (auto-generated name).
alter table public.ratings drop constraint if exists ratings_booking_id_rater_id_key;

-- Add the per-ratee uniqueness if it isn't already present. This requires no two
-- existing rows share (rater_id, ratee_id); if duplicates exist from testing,
-- delete the extras first.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ratings_rater_id_ratee_id_key'
  ) then
    alter table public.ratings
      add constraint ratings_rater_id_ratee_id_key unique (rater_id, ratee_id);
  end if;
end $$;

NOTIFY pgrst, 'reload schema';
