-- ============================================================================
-- 0035_booking_slot.sql
--
-- Accepting a request now consumes the cleaner's WHOLE availability slot that
-- contains it (a booking only has a start time and an *estimated* length, so
-- what's left of the slot is not "free time" — the cleaner adds another slot
-- if they really are free again). Previously the booked window was carved out
-- and the remainders stayed open.
--
--   bookings.slot_start / slot_end   the slot that was consumed on accept, so a
--                                    cancellation can put exactly that slot back
--
-- Bookings accepted before this change have these null and keep the old
-- behavior on cancel (the carved-out window is restored).
--
-- Apply by hand in the Supabase SQL Editor. Until it runs, accepting falls back
-- to the old carve-out behavior, so nothing breaks.
-- ============================================================================

alter table public.bookings
  add column if not exists slot_start time,
  add column if not exists slot_end time;

notify pgrst, 'reload schema';
