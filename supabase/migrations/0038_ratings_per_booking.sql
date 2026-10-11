-- ============================================================================
-- 0038_ratings_per_booking.sql
--
-- One rating PER CLEAN instead of one per person. A host who has had Maya clean
-- six times can rate each clean; every rating counts toward Maya's average and
-- her rating_count ("5.0 · 6 cleans"). The aggregate trigger from 0011 already
-- averages every ratings row for a ratee, so only the uniqueness changes:
--
--   before: unique (rater_id, ratee_id)   -- one editable rating per person
--   after:  unique (booking_id, rater_id) -- one editable rating per clean
--
-- Existing ratings are kept exactly as they are (each already points at the
-- booking it was left from). Earlier cleans with the same person are simply
-- unrated until the host rates them — nothing is invented.
--
-- Apply by hand in the Supabase SQL Editor. Until it runs the app keeps working
-- the old way (one rating per person is updated in place).
-- ============================================================================

alter table public.ratings drop constraint if exists ratings_rater_id_ratee_id_key;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ratings_booking_id_rater_id_key') then
    alter table public.ratings add constraint ratings_booking_id_rater_id_key unique (booking_id, rater_id);
  end if;
end $$;

-- Recompute the stored averages from the rows (same maths the trigger uses).
update public.cleaners c set
  rating_count = coalesce((select count(*) from public.ratings r where r.ratee_id = c.id), 0),
  rating_avg   = (select round(avg(score), 2) from public.ratings r where r.ratee_id = c.id);
update public.customers c set
  rating_count = coalesce((select count(*) from public.ratings r where r.ratee_id = c.id), 0),
  rating_avg   = (select round(avg(score), 2) from public.ratings r where r.ratee_id = c.id);

notify pgrst, 'reload schema';
