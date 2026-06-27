-- Household details on the customer profile, shown to cleaners so they can size
-- up a job before accepting. All nullable so existing customer rows stay valid.
alter table public.customers
  add column if not exists num_rooms integer,
  add column if not exists pet_types text[] not null default '{}',
  add column if not exists num_pets integer,
  add column if not exists num_kids_under_15 integer,
  add column if not exists num_people integer,
  add column if not exists house_size_sqm integer,
  add column if not exists dwelling_type text,
  add column if not exists floor integer;

-- Constrain the two enumerated columns. pet_types only ever holds 'dog'/'cat';
-- dwelling_type is 'apartment' or 'house' (null when unspecified).
alter table public.customers
  drop constraint if exists customers_dwelling_type_check;
alter table public.customers
  add constraint customers_dwelling_type_check
  check (dwelling_type is null or dwelling_type in ('apartment', 'house'));

alter table public.customers
  drop constraint if exists customers_pet_types_check;
alter table public.customers
  add constraint customers_pet_types_check
  check (pet_types <@ array['dog', 'cat']::text[]);
