-- ============================================================================
-- 0039_locality_on_profiles.sql
--
-- Where a host lives / where a cleaner is based, as a PICKED official locality
-- (see 0037_localities_service_areas.sql) instead of only free text:
--
--   customers.locality_id   the host's chosen locality — also what service-area
--                           availability will be decided from (a later phase)
--   cleaners.locality_id    the cleaner's home locality
--
-- Nullable, so every existing row is untouched. Users who haven't picked one are
-- asked to by a notification. The free-text `address` columns stay as they are
-- (the street, plus the locality name) — nothing existing is rewritten.
--
-- Apply by hand in the Supabase SQL Editor. Until it runs, picking a locality
-- still works for matching (the address and coordinates are saved as before);
-- only the stored locality link is skipped.
-- ============================================================================

alter table public.customers add column if not exists locality_id uuid references public.localities(id) on delete set null;
alter table public.cleaners  add column if not exists locality_id uuid references public.localities(id) on delete set null;

create index if not exists customers_locality_idx on public.customers (locality_id);
create index if not exists cleaners_locality_idx on public.cleaners (locality_id);

notify pgrst, 'reload schema';
