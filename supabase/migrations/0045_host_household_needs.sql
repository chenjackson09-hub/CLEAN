-- 0045_host_household_needs.sql
-- Household and cleaning-needs details a host can add so cleaners understand who they would be
-- working for. They feed the generated "About us" paragraph (stored in the existing customers.bio).
-- Everything is additive and nullable: existing hosts keep every value they already have.
--
-- The app saves these in a SEPARATE best-effort write, so a database without this migration never
-- blocks sign-up or a profile save — the new answers just aren't stored until it is applied.

alter table public.customers add column if not exists household_type text;
alter table public.customers add column if not exists household_note text;
alter table public.customers add column if not exists home_vibe text[] not null default '{}';
alter table public.customers add column if not exists home_note text;
alter table public.customers add column if not exists typical_hours numeric(3,1);
alter table public.customers add column if not exists preferred_days text[] not null default '{}';
alter table public.customers add column if not exists days_flexible boolean not null default false;
alter table public.customers add column if not exists flexibility text;
alter table public.customers add column if not exists extra_note text;

alter table public.customers drop constraint if exists customers_household_type_check;
alter table public.customers add constraint customers_household_type_check
  check (household_type is null or household_type in ('alone','couple','family','family_kids','roommates','other'));

alter table public.customers drop constraint if exists customers_flexibility_check;
alter table public.customers add constraint customers_flexibility_check
  check (flexibility is null or flexibility in ('fixed','somewhat','very'));

alter table public.customers drop constraint if exists customers_typical_hours_check;
alter table public.customers add constraint customers_typical_hours_check
  check (typical_hours is null or (typical_hours >= 0.5 and typical_hours <= 12));

-- Widen the existing option lists: monthly/other frequency, "both" cleaning types, dishes as a task.
alter table public.customers drop constraint if exists customers_usage_frequency_check;
alter table public.customers add constraint customers_usage_frequency_check
  check (usage_frequency is null or usage_frequency in ('weekly','twice_monthly','monthly','occasional','one_time','other'));

alter table public.customers drop constraint if exists customers_usual_cleaning_type_check;
alter table public.customers add constraint customers_usual_cleaning_type_check
  check (usual_cleaning_type is null or usual_cleaning_type in ('regular','deep','both'));

alter table public.customers drop constraint if exists customers_cleaning_priorities_check;
alter table public.customers add constraint customers_cleaning_priorities_check
  check (cleaning_priorities <@ array['kitchen','bathrooms','floors','dusting','windows','linens','laundry','dishes','outdoor','other']::text[]);

notify pgrst, 'reload schema';
