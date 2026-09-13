-- ============================================================================
-- 0031_clean_groups.sql
--
-- "Add a clean" (browse): a host can mark several candidate days as all being
-- options for the *same* cleaning need (e.g. "any of these 3 days this
-- week"), tagged with a color they pick so they can tell one need apart from
-- another. Mechanically this is just a client-generated id stamped onto every
-- booking created while that "clean" is in progress — no new table, since a
-- group has no existence beyond tagging the bookings that belong to it.
--
-- Both columns are nullable: a booking made through the normal single-request
-- browse/profile flow (the vast majority, and all pre-existing rows) simply
-- has clean_group_id = null, which keeps today's existing "accepting one
-- cancels ALL my other pending requests" behavior for that flow untouched —
-- see respondToBooking. Only a grouped booking's siblings-cancel is scoped to
-- the same clean_group_id instead.
-- ============================================================================

alter table public.bookings add column if not exists clean_group_id uuid;
alter table public.bookings add column if not exists clean_group_color text;

create index if not exists bookings_clean_group_id_idx
  on public.bookings (clean_group_id)
  where clean_group_id is not null;

NOTIFY pgrst, 'reload schema';
