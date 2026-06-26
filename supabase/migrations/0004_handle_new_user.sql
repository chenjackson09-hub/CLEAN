-- Capture the `handle_new_user` signup trigger in version control.
--
-- This trigger already existed in the live database but had never been tracked
-- in a migration (an out-of-band DB object — exactly the kind CLAUDE.md warns
-- about). It runs AFTER INSERT on auth.users and creates the role-specific rows
-- from the new user's raw_user_meta_data, defaulting to 'customer' when no role
-- metadata is supplied.
--
-- The client registration flow now passes { role: 'customer' | 'cleaner' } via
-- supabase.auth.signUp options.data, so this trigger creates the correct skeleton
-- rows and the client upserts fill in the detailed fields. Every insert here is
-- idempotent (ON CONFLICT DO NOTHING / NOT EXISTS) so it can never collide with
-- the client writes.

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := coalesce(meta->>'role', 'customer');
begin
  insert into public.profiles (id, role, full_name, phone)
  values (new.id, v_role::user_role, meta->>'full_name', meta->>'phone')
  on conflict (id) do nothing;

  if v_role = 'customer' then
    insert into public.customers (id, bio, address, lat, lng, preferred_service_type)
    values (
      new.id,
      meta->>'bio',
      meta->>'address',
      nullif(meta->>'lat', '')::float8,
      nullif(meta->>'lng', '')::float8,
      nullif(meta->>'preferred_service_type', '')::service_type
    )
    on conflict (id) do nothing;

  elsif v_role = 'cleaner' then
    insert into public.cleaners (
      id, bio, service_types, hourly_rate, years_experience, languages, status, address
    )
    values (
      new.id,
      meta->>'bio',
      coalesce(array(select jsonb_array_elements_text(meta->'service_types')), '{}'),
      nullif(meta->>'hourly_rate', '')::numeric,
      nullif(meta->>'years_experience', '')::int,
      coalesce(array(select jsonb_array_elements_text(meta->'languages')), '{}'),
      'pending',
      meta->>'address'
    )
    on conflict (id) do nothing;

    insert into public.cleaner_applications (cleaner_id, status, submitted_at)
    select new.id, 'pending', now()
    where not exists (
      select 1 from public.cleaner_applications where cleaner_id = new.id
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
