-- ============================================================================
-- 0023_customer_approval.sql
--
-- Customers now need admin approval before they can browse cleaners or book,
-- mirroring how a cleaner isn't bookable until their application is
-- approved. `status` mirrors cleaner_status's pending/approved/rejected
-- values (no 'suspended' — a blocked customer is hard-deleted, see
-- blocked_users). `status_reviewed_at` is the customer-side analog of
-- cleaner_applications.reviewed_at, for the admin Applications list.
--
-- IMPORTANT — grandfathering: every customer that already exists before this
-- migration runs is backfilled to 'approved' so nobody currently using the
-- app gets locked out. Only customers created AFTER this runs start pending.
-- Apply by hand in the Supabase SQL Editor.
-- ============================================================================

alter table public.customers add column if not exists status text;
alter table public.customers add column if not exists status_reviewed_at timestamptz;

update public.customers set status = 'approved' where status is null;

alter table public.customers alter column status set default 'pending';
alter table public.customers alter column status set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_status_check') then
    alter table public.customers
      add constraint customers_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

NOTIFY pgrst, 'reload schema';
