-- ============================================================================
-- 0033_schedule_changes.sql
--
-- When a cleaner deletes or shrinks an availability slot that a pending request
-- was relying on, the HOST has to hear about it and the ADMIN dashboard has to
-- flag it:
--
--   bookings.status_reason          why a request ended without the host doing
--                                   it ('cleaner_unavailable' = the cleaner
--                                   deleted the slot it relied on). The host
--                                   sees "Cleaner no longer available".
--   bookings.availability_notice    set when the cleaner CHANGED their times so
--                                   a still-pending request is no longer inside
--                                   them; holds the new times ("10:00–13:00").
--                                   The host sees a bold notice with a v / x.
--   bookings.availability_notice_at when that notice was raised.
--   schedule_events                 one row per such change, read only by the
--                                   admin "Recent activity" feed (flagged "!").
--
-- Apply by hand in the Supabase SQL Editor. Until it runs, slot edits/deletes
-- still work, but hosts aren't notified and admin sees nothing.
-- ============================================================================

alter table public.bookings
  add column if not exists status_reason text,
  add column if not exists availability_notice text,
  add column if not exists availability_notice_at timestamptz;

alter table public.bookings
  drop constraint if exists bookings_status_reason_check;
alter table public.bookings
  add constraint bookings_status_reason_check
  check (status_reason is null or status_reason in ('cleaner_unavailable'));

create table if not exists public.schedule_events (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('slot_deleted', 'slot_changed')),
  cleaner_id     uuid not null references public.profiles(id) on delete cascade,
  affected_count int  not null default 0,
  detail         text,
  created_at     timestamptz not null default now()
);

create index if not exists schedule_events_created_at_idx
  on public.schedule_events (created_at desc);

-- RLS on, no policies: only the service-role client (server actions + the
-- admin dashboard) reads or writes it.
alter table public.schedule_events enable row level security;

notify pgrst, 'reload schema';
