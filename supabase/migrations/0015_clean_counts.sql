-- ============================================================================
-- 0015_clean_counts.sql
--
-- A lifetime "cleans completed" counter on each side of a booking:
--   * cleaners.cleans_completed  — how many cleans this cleaner has finished
--   * customers.cleans_completed — how many cleans this customer has had done
--
-- Both go up by one the moment a booking becomes `completed` (the cleaner
-- presses "Complete" → completeBooking sets status='completed'). Kept current by
-- a trigger on `bookings` so reads need no aggregation query — same denormalized
-- pattern as the ratings aggregates in 0011.
--
-- The trigger RECOMPUTES from the bookings table rather than blindly doing +1,
-- so the counts are self-healing: re-running the backfill, or any future path
-- that moves a booking out of `completed`, leaves them correct (no drift, no
-- double counting).
--
-- Apply by hand in the Supabase SQL Editor (no CLI linked). The app errors on
-- the new columns until this runs.
-- ============================================================================

-- Denormalized counters ------------------------------------------------------
alter table public.cleaners  add column if not exists cleans_completed int not null default 0;
alter table public.customers add column if not exists cleans_completed int not null default 0;

-- Count maintenance ----------------------------------------------------------
-- SECURITY DEFINER because completing a booking (a cleaner action) must update
-- the *customer's* row too, which the cleaner's RLS can't touch. Locked down
-- below: EXECUTE revoked from anon/authenticated/public so it's not an RPC
-- surface (matches the 0010 security-lint hardening).
create or replace function public.refresh_clean_counts(p_cleaner uuid, p_customer uuid)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $$
begin
  if p_cleaner is not null then
    update public.cleaners set
      cleans_completed = (
        select count(*) from public.bookings
        where cleaner_id = p_cleaner and status = 'completed'
      )
    where id = p_cleaner;
  end if;
  if p_customer is not null then
    update public.customers set
      cleans_completed = (
        select count(*) from public.bookings
        where customer_id = p_customer and status = 'completed'
      )
    where id = p_customer;
  end if;
end;
$$;

create or replace function public.on_booking_status_change()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_clean_counts(old.cleaner_id, old.customer_id);
    return old;
  end if;
  -- INSERT, or an UPDATE that actually changed the status, can affect a count.
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    perform public.refresh_clean_counts(new.cleaner_id, new.customer_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_booking_status_change on public.bookings;
create trigger trg_booking_status_change
  after insert or update or delete on public.bookings
  for each row execute function public.on_booking_status_change();

-- Keep these SECURITY DEFINER helpers off the public RPC surface.
revoke execute on function public.refresh_clean_counts(uuid, uuid) from anon, authenticated, public;
revoke execute on function public.on_booking_status_change() from anon, authenticated, public;

-- Backfill existing completed bookings ---------------------------------------
update public.cleaners c set cleans_completed = (
  select count(*) from public.bookings b
  where b.cleaner_id = c.id and b.status = 'completed'
);
update public.customers cu set cleans_completed = (
  select count(*) from public.bookings b
  where b.customer_id = cu.id and b.status = 'completed'
);

-- Refresh PostgREST's schema cache so the new columns are visible.
NOTIFY pgrst, 'reload schema';
