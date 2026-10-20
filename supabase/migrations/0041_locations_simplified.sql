-- Locations, simplified (replaces the date-based overview from 0040 with
-- current-totals functions). Additive: nothing is dropped, so the old 0040
-- functions keep working until nothing calls them.
--
--   localities.name_en_display     the English spelling shown in the app
--                                  ("Beit Hillel"); the official CBS spelling in
--                                  name_en is never changed
--   admin_locations_summary()      the six cards + how many people have no area yet
--   admin_locations_list()         one filtered, sorted, paginated page of localities
--   admin_locations_regions()      per-region totals for the Regional Overview
--
-- Definitions (the only place they live):
--   open      = locality_effective_availability.is_active (own setting → region → closed)
--   customer  = customers.status = 'approved' with a chosen locality
--   cleaner   = cleaners.status  = 'approved' with a chosen locality
--   waiting   = those same people, in a locality that is not open
-- Apply by hand in the Supabase SQL Editor.

alter table public.localities add column if not exists name_en_display text;

create or replace function public.admin_locations_summary()
returns table (
  total_localities bigint, open_localities bigint,
  customers bigint, cleaners bigint,
  waiting_customers bigint, waiting_cleaners bigint,
  no_area_customers bigint, no_area_cleaners bigint
)
language sql stable security definer set search_path = public as $$
  with loc as (
    select l.id, coalesce(e.is_active, false) as is_open
    from public.localities l
    left join public.locality_effective_availability e on e.locality_id = l.id
  ),
  cu as (select locality_id, count(*) as n from public.customers where status = 'approved' and locality_id is not null group by locality_id),
  cl as (select locality_id, count(*) as n from public.cleaners  where status = 'approved' and locality_id is not null group by locality_id)
  select
    (select count(*) from loc),
    (select count(*) from loc where is_open),
    (select coalesce(sum(n), 0)::bigint from cu),
    (select coalesce(sum(n), 0)::bigint from cl),
    (select coalesce(sum(cu.n), 0)::bigint from cu join loc on loc.id = cu.locality_id where not loc.is_open),
    (select coalesce(sum(cl.n), 0)::bigint from cl join loc on loc.id = cl.locality_id where not loc.is_open),
    (select count(*) from public.customers where status = 'approved' and locality_id is null),
    (select count(*) from public.cleaners  where status = 'approved' and locality_id is null);
$$;

create or replace function public.admin_locations_list(
  p_ids uuid[] default null,          -- null = no text search; otherwise the matching ids, best first
  p_district text default '',
  p_region uuid default null,
  p_status text default '',           -- '' | 'open' | 'closed'
  p_users text default '',            -- '' | customers | cleaners | waiting | waiting_customers | waiting_cleaners
  p_sort text default 'customers',    -- name | status | customers | cleaners | waiting | relevance
  p_dir text default 'desc',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  locality_id uuid, cbs_code integer, name_he text, name_en text, name_en_display text, district text,
  region_id uuid, region_name text, is_open boolean, status_source text,
  customers bigint, cleaners bigint, waiting bigint, total_count bigint
)
language sql stable security definer set search_path = public as $$
  with cu as (select locality_id, count(*) as n from public.customers where status = 'approved' and locality_id is not null group by locality_id),
  cl as (select locality_id, count(*) as n from public.cleaners  where status = 'approved' and locality_id is not null group by locality_id),
  base as (
    select l.id as locality_id, l.cbs_code, l.name_he, l.name_en, l.name_en_display, l.district,
           m.region_id, r.name as region_name,
           coalesce(e.is_active, false) as is_open,
           coalesce(e.source, 'default') as status_source,
           coalesce(cu.n, 0) as customers, coalesce(cl.n, 0) as cleaners
    from public.localities l
    left join public.locality_effective_availability e on e.locality_id = l.id
    left join public.service_region_members m on m.locality_id = l.id
    left join public.service_regions r on r.id = m.region_id
    left join cu on cu.locality_id = l.id
    left join cl on cl.locality_id = l.id
    where (p_ids is null or l.id = any(p_ids))
      and (p_district = '' or l.district = p_district)
      and (p_region is null or m.region_id = p_region)
  ),
  filtered as (
    select b.*, case when not b.is_open then b.customers + b.cleaners else 0 end as waiting
    from base b
    where (p_status = '' or (p_status = 'open' and b.is_open) or (p_status = 'closed' and not b.is_open))
      and (p_users = ''
           or (p_users = 'customers' and b.customers > 0)
           or (p_users = 'cleaners' and b.cleaners > 0)
           or (p_users = 'waiting' and not b.is_open and b.customers + b.cleaners > 0)
           or (p_users = 'waiting_customers' and not b.is_open and b.customers > 0)
           or (p_users = 'waiting_cleaners' and not b.is_open and b.cleaners > 0))
  )
  select f.locality_id, f.cbs_code, f.name_he, f.name_en, f.name_en_display, f.district,
         f.region_id, f.region_name, f.is_open, f.status_source,
         f.customers, f.cleaners, f.waiting, count(*) over () as total_count
  from filtered f
  order by
    (case p_sort
       when 'customers' then f.customers
       when 'cleaners' then f.cleaners
       when 'waiting' then f.waiting
       when 'status' then (case when f.is_open then 1 else 0 end)
       when 'relevance' then coalesce(array_position(p_ids, f.locality_id), 0)
       else 0 end)::numeric * (case when p_dir = 'asc' then 1 else -1 end),
    (case when p_sort = 'name' and p_dir = 'desc' then f.name_he end) desc,
    f.name_he asc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

create or replace function public.admin_locations_regions()
returns table (
  region_id uuid, name text, description text, is_active boolean,
  localities bigint, open_localities bigint, own_setting bigint,
  customers bigint, cleaners bigint, waiting_customers bigint, waiting_cleaners bigint
)
language sql stable security definer set search_path = public as $$
  with cu as (select locality_id, count(*) as n from public.customers where status = 'approved' and locality_id is not null group by locality_id),
  cl as (select locality_id, count(*) as n from public.cleaners  where status = 'approved' and locality_id is not null group by locality_id)
  select r.id, r.name, r.description, r.is_active,
         count(m.locality_id),
         count(m.locality_id) filter (where e.is_active),
         count(m.locality_id) filter (where e.source = 'override'),
         coalesce(sum(cu.n), 0)::bigint,
         coalesce(sum(cl.n), 0)::bigint,
         coalesce(sum(cu.n) filter (where not coalesce(e.is_active, false)), 0)::bigint,
         coalesce(sum(cl.n) filter (where not coalesce(e.is_active, false)), 0)::bigint
  from public.service_regions r
  left join public.service_region_members m on m.region_id = r.id
  left join public.locality_effective_availability e on e.locality_id = m.locality_id
  left join cu on cu.locality_id = m.locality_id
  left join cl on cl.locality_id = m.locality_id
  group by r.id, r.name, r.description, r.is_active
  order by r.name;
$$;

revoke all on function public.admin_locations_summary() from public, anon, authenticated;
revoke all on function public.admin_locations_list(uuid[], text, uuid, text, text, text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_locations_regions() from public, anon, authenticated;

notify pgrst, 'reload schema';
