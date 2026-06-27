-- Allow an "other" pet type alongside dog/cat.
alter table public.customers
  drop constraint if exists customers_pet_types_check;
alter table public.customers
  add constraint customers_pet_types_check
  check (pet_types <@ array['dog', 'cat', 'other']::text[]);
