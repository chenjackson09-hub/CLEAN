-- ============================================================================
-- 0037_localities_service_areas.sql
--
-- Foundation for location accuracy and admin-controlled service areas.
--
--   localities                 the official list of Israeli localities (imported
--                              from the Central Bureau of Statistics file by
--                              `npm run import:localities`) — GEOGRAPHY ONLY.
--                              Being in this table does NOT mean the app
--                              operates there.
--   locality_aliases           extra spellings (added by an admin; the import
--                              never invents any)
--   service_regions            admin-defined groupings ("Northern Hula Valley")
--   service_region_members     which locality belongs to which region — one
--                              region per locality (PK on locality_id), so a
--                              locality can never be activated by two regions
--   locality_overrides         an explicit open/closed setting for one locality
--   locality_effective_availability  the single place availability is decided:
--                              1) the locality's own override, 2) its region's
--                              setting, 3) otherwise INACTIVE (nothing is open
--                              until an admin opens it)
--
-- RLS is on with NO policies: only the service-role client (the app's server code
-- and the admin panel) can read or write these tables; users never touch them
-- directly. Apply by hand in the Supabase SQL Editor. Nothing existing changes.
-- ============================================================================

create extension if not exists pg_trgm;

create table if not exists public.localities (
  id               uuid primary key default gen_random_uuid(),
  cbs_code         integer not null unique,          -- official, permanent identifier
  name_he          text not null,
  name_en          text,
  name_translit    text,                              -- CBS transliteration (upper-case Latin)
  locality_type    text not null default 'other'
                   check (locality_type in ('city','local_council','kibbutz','moshav','moshav_shitufi','community','village','bedouin_tribe','other')),
  form_code        integer,                           -- raw CBS settlement-form code
  district         text,
  subdistrict      text,
  regional_council text,
  municipal_status text,
  lat              double precision,                  -- null when the official file has none
  lng              double precision,
  population       integer,
  search_he        text not null default '',          -- normalized keys for matching
  search_en        text not null default '',
  source           text not null default 'cbs-localities-2023',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint localities_coords_pair check ((lat is null) = (lng is null))
);

create index if not exists localities_search_he_trgm on public.localities using gin (search_he gin_trgm_ops);
create index if not exists localities_search_en_trgm on public.localities using gin (search_en gin_trgm_ops);
create index if not exists localities_type_idx on public.localities (locality_type);
create index if not exists localities_council_idx on public.localities (regional_council);

create table if not exists public.locality_aliases (
  id           uuid primary key default gen_random_uuid(),
  locality_id  uuid not null references public.localities(id) on delete cascade,
  alias        text not null,
  alias_search text not null,
  lang         text not null check (lang in ('he','en')),
  source       text not null default 'admin',
  created_at   timestamptz not null default now(),
  unique (locality_id, alias_search)
);
create index if not exists locality_aliases_search_trgm on public.locality_aliases using gin (alias_search gin_trgm_ops);

create table if not exists public.service_regions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  is_active   boolean not null default false,         -- regions start closed
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One region per locality: no locality can be switched on by two regions.
create table if not exists public.service_region_members (
  locality_id uuid primary key references public.localities(id) on delete cascade,
  region_id   uuid not null references public.service_regions(id) on delete cascade,
  added_at    timestamptz not null default now()
);
create index if not exists service_region_members_region_idx on public.service_region_members (region_id);

create table if not exists public.locality_overrides (
  locality_id uuid primary key references public.localities(id) on delete cascade,
  is_active   boolean not null,
  note        text,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- Effective availability. A locality is active only if it says so itself or its
-- region does; with no setting anywhere it is inactive.
create or replace view public.locality_effective_availability as
select
  l.id as locality_id,
  case
    when o.locality_id is not null then o.is_active
    when r.id is not null then r.is_active
    else false
  end as is_active,
  case
    when o.locality_id is not null then 'override'
    when r.id is not null then 'region'
    else 'default'
  end as source,
  r.id as region_id
from public.localities l
left join public.locality_overrides o on o.locality_id = l.id
left join public.service_region_members m on m.locality_id = l.id
left join public.service_regions r on r.id = m.region_id;

alter table public.localities enable row level security;
alter table public.locality_aliases enable row level security;
alter table public.service_regions enable row level security;
alter table public.service_region_members enable row level security;
alter table public.locality_overrides enable row level security;

-- The view reads RLS-protected tables as its owner, so keep it service-role only too.
revoke all on public.locality_effective_availability from anon, authenticated;

notify pgrst, 'reload schema';
