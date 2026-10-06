-- ============================================================================
-- 0036_booking_cancellation.sql
--
-- Cancelling a booking keeps the booking (status = 'cancelled') and now also
-- records who cancelled it, when, why, and what it was before. Nothing here is
-- shown as a penalty — it is the history Cindy needs to understand cancellation
-- behaviour later (how many, how early, how often).
--
--   cancelled_by            'host' | 'cleaner'
--   cancelled_at            when (compare with scheduled_date + scheduled_start
--                           to get how long before the clean it happened)
--   cancellation_reason     one of the fixed reason keys (see lib/cancellation.ts)
--   cancellation_message    optional short note to the other person
--   cancelled_from_status   'pending' (a request withdrawn) or 'accepted' (a
--                           confirmed clean cancelled) — only the latter is a
--                           "cancelled cleaning"
--
-- All nullable, so every existing row is untouched. Apply by hand in the
-- Supabase SQL Editor. Until it runs, cancelling still works (the app falls back to
-- the status alone) but nothing is recorded: no reason, no cancelled-by, no chat entry.
-- ============================================================================

alter table public.bookings
  add column if not exists cancelled_by text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_message text,
  add column if not exists cancelled_from_status text;

alter table public.bookings drop constraint if exists bookings_cancelled_by_check;
alter table public.bookings
  add constraint bookings_cancelled_by_check check (cancelled_by is null or cancelled_by in ('host', 'cleaner'));

alter table public.bookings drop constraint if exists bookings_cancelled_from_status_check;
alter table public.bookings
  add constraint bookings_cancelled_from_status_check
  check (cancelled_from_status is null or cancelled_from_status in ('pending', 'accepted'));

alter table public.bookings drop constraint if exists bookings_cancellation_reason_check;
alter table public.bookings
  add constraint bookings_cancellation_reason_check
  check (cancellation_reason is null or cancellation_reason in
    ('plans_changed', 'time_no_longer_works', 'no_longer_need', 'unexpected', 'other'));

-- Later reporting (cancellations per person) filters on these.
create index if not exists bookings_cancelled_at_idx on public.bookings (cancelled_at) where cancelled_at is not null;

notify pgrst, 'reload schema';
