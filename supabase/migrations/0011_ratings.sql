-- ============================================================================
-- 0011_ratings.sql
--
-- Mutual numeric ratings (no text reviews yet). After a booking is `completed`,
-- the customer rates the cleaner (1-5) and the cleaner rates the customer (1-5).
-- Each rater leaves at most one (editable) rating per person they rate, regardless
-- of how many bookings they share. Those scores are averaged into a denormalized
-- `rating_avg` / `rating_count`
-- on `cleaners` / `customers`, kept current by a trigger so reads (browse cards,
-- profiles, admin lists) need no aggregation query.
--
-- Apply by hand in the Supabase SQL Editor (no CLI linked). The app errors on the
-- new columns until this runs.
-- ============================================================================

-- Source-of-truth table -----------------------------------------------------
create table if not exists public.ratings (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  rater_id    uuid not null references public.profiles(id) on delete cascade,
  ratee_id    uuid not null references public.profiles(id) on delete cascade,
  ratee_role  public.user_role not null,           -- the *recipient's* role
  score       int not null check (score between 1 and 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- One rating per rater per *ratee* (not per booking): a customer who books the
  -- same cleaner repeatedly still leaves a single rating they can edit. booking_id
  -- records which booking the latest rating came from. Re-rating updates this row.
  unique (rater_id, ratee_id)
);

create index if not exists ratings_ratee_idx on public.ratings (ratee_id);

-- Denormalized aggregates ----------------------------------------------------
alter table public.cleaners  add column if not exists rating_avg   numeric(3,2);
alter table public.cleaners  add column if not exists rating_count int not null default 0;
alter table public.customers add column if not exists rating_avg   numeric(3,2);
alter table public.customers add column if not exists rating_count int not null default 0;

-- Aggregate maintenance ------------------------------------------------------
-- SECURITY DEFINER because the rater (e.g. a customer) must update the *ratee's*
-- row (a cleaner), which their own RLS can't touch. Locked down below: EXECUTE is
-- revoked from anon/authenticated/public so it's not callable as an RPC (matches
-- the 0010 security-lint hardening).
create or replace function public.refresh_rating_aggregate(p_ratee uuid, p_role public.user_role)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $$
begin
  if p_role = 'cleaner' then
    update public.cleaners set
      rating_count = (select count(*)              from public.ratings where ratee_id = p_ratee),
      rating_avg   = (select round(avg(score), 2)  from public.ratings where ratee_id = p_ratee)
    where id = p_ratee;
  elsif p_role = 'customer' then
    update public.customers set
      rating_count = (select count(*)              from public.ratings where ratee_id = p_ratee),
      rating_avg   = (select round(avg(score), 2)  from public.ratings where ratee_id = p_ratee)
    where id = p_ratee;
  end if;
end;
$$;

create or replace function public.on_rating_change()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_rating_aggregate(old.ratee_id, old.ratee_role);
    return old;
  end if;
  perform public.refresh_rating_aggregate(new.ratee_id, new.ratee_role);
  return new;
end;
$$;

drop trigger if exists trg_rating_change on public.ratings;
create trigger trg_rating_change
  after insert or update or delete on public.ratings
  for each row execute function public.on_rating_change();

-- Keep these SECURITY DEFINER helpers off the public RPC surface.
revoke execute on function public.refresh_rating_aggregate(uuid, public.user_role) from anon, authenticated, public;
revoke execute on function public.on_rating_change() from anon, authenticated, public;

-- RLS ------------------------------------------------------------------------
alter table public.ratings enable row level security;

-- A rater can read/write only their own rating rows; a ratee can read ratings
-- about them. The server actions additionally enforce "must be a participant of
-- a completed booking" before inserting.
drop policy if exists "Raters insert own ratings" on public.ratings;
create policy "Raters insert own ratings"
  on public.ratings for insert to authenticated
  with check (rater_id = auth.uid());

drop policy if exists "Raters update own ratings" on public.ratings;
create policy "Raters update own ratings"
  on public.ratings for update to authenticated
  using (rater_id = auth.uid())
  with check (rater_id = auth.uid());

drop policy if exists "Participants read ratings" on public.ratings;
create policy "Participants read ratings"
  on public.ratings for select to authenticated
  using (auth.uid() = rater_id or auth.uid() = ratee_id);

-- Refresh PostgREST's schema cache so the new table/columns are visible.
NOTIFY pgrst, 'reload schema';
