-- ============================================================================
-- 0032_chat.sql
--
-- Host <-> cleaner chat. One persistent conversation per (host, cleaner) pair
-- (NOT per booking); every confirmed booking between them is attached to that
-- conversation exactly once and rendered as a card in its timeline.
--
--   conversations         one row per host/cleaner relationship
--   messages              text messages (sender is always the authed user)
--   conversation_bookings booking -> conversation link (one row per booking)
--
-- Nothing about the booking is copied here: cards read date/start/location/
-- status live from `bookings` and the rate from `cleaners.hourly_rate`.
--
-- Writes to conversations / conversation_bookings only ever come from the
-- service-role client (the booking-approval flow and the chat page's
-- self-healing sync); users get read-only RLS on them. Users may INSERT their
-- own messages, enforced by RLS (sender_id = auth.uid() AND participant).
--
-- Apply by hand in the Supabase SQL Editor (no CLI linked). The chat pages
-- error until this runs; booking approval itself is unaffected (chat creation
-- there is best-effort).
-- ============================================================================

create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  host_id          uuid not null references public.profiles(id) on delete cascade,
  cleaner_id       uuid not null references public.profiles(id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  constraint conversations_distinct_parties check (host_id <> cleaner_id),
  -- One conversation per host/cleaner relationship; the find-or-create is an
  -- INSERT ... ON CONFLICT DO NOTHING against this, so it is race-safe.
  constraint conversations_pair_unique unique (host_id, cleaner_id)
);

create index if not exists conversations_host_idx on public.conversations (host_id, last_activity_at desc);
create index if not exists conversations_cleaner_idx on public.conversations (cleaner_id, last_activity_at desc);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(btrim(body)) between 1 and 2000),
  -- Client-generated id so a retried/double-submitted send can't insert twice.
  client_id       uuid,
  created_at      timestamptz not null default now(),
  constraint messages_client_id_unique unique (conversation_id, client_id)
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

create table if not exists public.conversation_bookings (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  created_at      timestamptz not null default now(),
  -- A booking can be attached to a conversation only once (and only one).
  primary key (booking_id)
);

create index if not exists conversation_bookings_conversation_idx
  on public.conversation_bookings (conversation_id, created_at);

-- Keep conversations.last_activity_at current for the inbox ordering.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_activity_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

revoke execute on function public.touch_conversation_on_message() from anon, authenticated, public;

drop trigger if exists trg_touch_conversation_on_message on public.messages;
create trigger trg_touch_conversation_on_message
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- ---------------------------------------------------------------------------
-- RLS: only the two participants can see or send anything.
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_bookings enable row level security;

drop policy if exists "participants read conversations" on public.conversations;
create policy "participants read conversations" on public.conversations
  for select using (auth.uid() in (host_id, cleaner_id));

drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and auth.uid() in (c.host_id, c.cleaner_id)
    )
  );

drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and auth.uid() in (c.host_id, c.cleaner_id)
    )
  );

drop policy if exists "participants read conversation bookings" on public.conversation_bookings;
create policy "participants read conversation bookings" on public.conversation_bookings
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_bookings.conversation_id and auth.uid() in (c.host_id, c.cleaner_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: messages and new booking cards stream to both participants
-- (postgres_changes honours the RLS policies above).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_bookings'
  ) then
    alter publication supabase_realtime add table public.conversation_bookings;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Backfill: every host/cleaner pair that already has an accepted/completed
-- booking gets its conversation, and each such booking gets its card.
-- Idempotent — safe to re-run.
-- ---------------------------------------------------------------------------
insert into public.conversations (host_id, cleaner_id)
select distinct b.customer_id, b.cleaner_id
from public.bookings b
where b.status in ('accepted', 'completed')
on conflict (host_id, cleaner_id) do nothing;

insert into public.conversation_bookings (conversation_id, booking_id, created_at)
select c.id, b.id, coalesce(b.responded_at, b.created_at)
from public.bookings b
join public.conversations c on c.host_id = b.customer_id and c.cleaner_id = b.cleaner_id
where b.status in ('accepted', 'completed')
on conflict (booking_id) do nothing;

notify pgrst, 'reload schema';
