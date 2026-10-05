-- ============================================================================
-- 0034_notifications.sql
--
-- In-app notifications (the header bell). One row per RECIPIENT per event,
-- written by the server actions that change something another user cares about
-- (request received/accepted/declined, cancellation, schedule change, rating…).
--
--   kind        what happened (rendered to text client-side, so EN/HE follow the
--               viewer's current language)
--   data        small jsonb of display values (names, date, times, score)
--   href        where tapping it goes
--   dedupe_key  optional "<kind>:<booking>" so a retried/duplicated action can't
--               notify twice (unique per user; NULLs are distinct, so
--               repeatable kinds just leave it null)
--   read_at     null = unread
--
-- RLS: a user reads and marks read only their own rows. Inserts only come from
-- the service-role client in server actions.
--
-- Apply by hand in the Supabase SQL Editor. Until it runs the bell is empty and
-- every notify() call is a logged no-op — nothing else is affected.
-- ============================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,
  actor_id   uuid references public.profiles(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  data       jsonb not null default '{}'::jsonb,
  href       text,
  dedupe_key text,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_dedupe unique (user_id, dedupe_key)
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "mark own notifications read" on public.notifications;
create policy "mark own notifications read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Live bell: new rows stream to their owner (postgres_changes honours the RLS above).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

notify pgrst, 'reload schema';
