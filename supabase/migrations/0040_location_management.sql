-- Location management & geographic analytics (step 1).
-- Additive and backward compatible: nothing here changes how existing data is
-- read, and the service-area gate keeps using locality_effective_availability.
--
--   locality_overrides.status   three-state launch status for a locality
--                               (open | coming_soon | not_open). is_active stays the
--                               single source the gate reads (true only for 'open').
--   locality_interest           a host asking to be told when their town opens
--   admin_location_overview()   one aggregated, paginated read for the admin table
--   admin_location_totals()     the summary cards
--   admin_location_districts()  distinct districts for the filter
--
-- "Active" is defined here, once: a person is active in a period if they sent a
-- booking request (host), answered one (cleaner) or sent a chat message.
-- Apply by hand in the Supabase SQL Editor.

alter table public.locality_overrides
  add column if not exists status text
  check (status in ('open', 'coming_soon', 'not_open'));

-- Existing overrides keep meaning exactly what they meant.
update public.locality_overrides
set status = case when is_active then 'open' else 'not_open' end
where status is null;

create table if not exists public.locality_interest (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  locality_id  uuid not null references public.localities(id) on delete cascade,
  created_at   timestamptz not null default now(),
  notified_at  timestamptz,
  unique (user_id, locality_id)
);
create index if not exists locality_interest_locality_idx on public.locality_interest (locality_id) where notified_at is null;
alter table public.locality_interest enable row level security;
-- service-role only (the app writes it through server actions)

-- Supporting indexes for the activity aggregates.
create index if not exists bookings_created_at_idx on public.bookings (created_at);
create index if not exists messages_created_at_idx on public.messages (created_at);

create or replace function public.admin_location_districts()
returns table (district text)
language sql stable security definer set search_path = public as $$
  select distinct l.district from public.localities l where l.district is not null order by 1;
$$;

create or replace function public.admin_location_totals(p_since timestamptz, p_until timestamptz)
returns table (
  total_localities bigint, open_localities bigint, hosts bigint, active_hosts bigint,
  cleaners bigint, active_cleaners bigint, requests bigint, waiting bigint
)
language sql stable security definer set search_path = public as $$
  with active as (
    select customer_id as uid from public.bookings where created_at >= p_since and created_at < p_until
    union
    select cleaner_id from public.bookings where responded_at >= p_since and responded_at < p_until
    union
    select sender_id from public.messages where created_at >= p_since and created_at < p_until
  ),
  h as (select c.id from public.customers c where c.locality_id is not null and c.status = 'approved'),
  cl as (select c.id from public.cleaners c where c.locality_id is not null and c.status = 'approved')
  select
    (select count(*) from public.localities),
    (select count(*) from public.localities l
       left join public.locality_overrides o on o.locality_id = l.id
       left join public.locality_effective_availability e on e.locality_id = l.id
     where coalesce(o.status, case when e.is_active then 'open' else 'not_open' end) = 'open'),
    (select count(*) from h),
    (select count(*) from h where id in (select uid from active)),
    (select count(*) from cl),
    (select count(*) from cl where id in (select uid from active)),
    (select count(*) from public.bookings b join public.customers c on c.id = b.customer_id
       where c.locality_id is not null and b.created_at >= p_since and b.created_at < p_until),
    (select count(*) from public.locality_interest where notified_at is null);
$$;

create or replace function public.admin_location_overview(
  p_since timestamptz, p_until timestamptz,
  p_he text default '', p_en text default '', p_code text default '',
  p_district text default '', p_status text default '',
  p_only_with_users boolean default false,
  p_sort text default 'hosts', p_dir text default 'desc',
  p_limit int default 25, p_offset int default 0
)
returns table (
  locality_id uuid, cbs_code integer, name_he text, name_en text, district text,
  status text, status_source text,
  hosts bigint, active_hosts bigint, cleaners bigint, requests bigint, waiting bigint,
  new_users bigint, prev_new_users bigint, total_count bigint
)
language sql stable security definer set search_path = public as $$
  with period as (select p_until - p_since as span),
  active as (
    select customer_id as uid from public.bookings where created_at >= p_since and created_at < p_until
    union
    select cleaner_id from public.bookings where responded_at >= p_since and responded_at < p_until
    union
    select sender_id from public.messages where created_at >= p_since and created_at < p_until
  ),
  hosts_by as (
    select c.locality_id, count(*) as n,
           count(*) filter (where c.id in (select uid from active)) as active_n
    from public.customers c
    where c.locality_id is not null and c.status = 'approved'
    group by c.locality_id
  ),
  cleaners_by as (
    select c.locality_id, count(*) as n
    from public.cleaners c
    where c.locality_id is not null and c.status = 'approved'
    group by c.locality_id
  ),
  requests_by as (
    select c.locality_id, count(*) as n
    from public.bookings b join public.customers c on c.id = b.customer_id
    where c.locality_id is not null and b.created_at >= p_since and b.created_at < p_until
    group by c.locality_id
  ),
  waiting_by as (
    select locality_id, count(*) as n from public.locality_interest where notified_at is null group by locality_id
  ),
  signups as (
    select x.locality_id,
           count(*) filter (where p.created_at >= p_since and p.created_at < p_until) as cur,
           count(*) filter (where p.created_at >= p_since - (select span from period) and p.created_at < p_since) as prev
    from (
      select id, locality_id from public.customers where locality_id is not null and status = 'approved'
      union all
      select id, locality_id from public.cleaners where locality_id is not null and status = 'approved'
    ) x
    join public.profiles p on p.id = x.id
    group by x.locality_id
  ),
  base as (
    select l.id as locality_id, l.cbs_code, l.name_he, l.name_en, l.district,
           coalesce(o.status, case when e.is_active then 'open' else 'not_open' end) as status,
           case when o.locality_id is not null then 'override' when e.is_active then 'region' else 'default' end as status_source,
           coalesce(hb.n, 0) as hosts, coalesce(hb.active_n, 0) as active_hosts,
           coalesce(cb.n, 0) as cleaners, coalesce(rb.n, 0) as requests, coalesce(wb.n, 0) as waiting,
           coalesce(s.cur, 0) as new_users, coalesce(s.prev, 0) as prev_new_users
    from public.localities l
    left join public.locality_overrides o on o.locality_id = l.id
    left join public.locality_effective_availability e on e.locality_id = l.id
    left join hosts_by hb on hb.locality_id = l.id
    left join cleaners_by cb on cb.locality_id = l.id
    left join requests_by rb on rb.locality_id = l.id
    left join waiting_by wb on wb.locality_id = l.id
    left join signups s on s.locality_id = l.id
    where (p_he = '' and p_en = '' and p_code = ''
           or (p_he <> '' and l.search_he like '%' || p_he || '%')
           or (p_en <> '' and l.search_en like '%' || p_en || '%')
           or (p_code <> '' and l.cbs_code::text = p_code))
      and (p_district = '' or l.district = p_district)
  )
  select b.locality_id, b.cbs_code, b.name_he, b.name_en, b.district, b.status, b.status_source,
         b.hosts, b.active_hosts, b.cleaners, b.requests, b.waiting, b.new_users, b.prev_new_users,
         count(*) over () as total_count
  from base b
  where (p_status = '' or b.status = p_status)
    and (not p_only_with_users or b.hosts + b.cleaners > 0)
  order by
    (case p_sort
       when 'hosts' then b.hosts when 'active' then b.active_hosts when 'cleaners' then b.cleaners
       when 'requests' then b.requests when 'waiting' then b.waiting when 'growth' then b.new_users
       else 0 end)::numeric * (case when p_dir = 'asc' then 1 else -1 end),
    b.name_he
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

revoke all on function public.admin_location_districts() from public, anon, authenticated;
revoke all on function public.admin_location_totals(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_location_overview(timestamptz, timestamptz, text, text, text, text, text, boolean, text, text, int, int) from public, anon, authenticated;

notify pgrst, 'reload schema';
