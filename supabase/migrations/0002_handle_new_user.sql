-- Create application rows when a new auth user signs up.
--
-- With email confirmation enabled, supabase.auth.signUp() returns a user but NO
-- session, so the client can no longer insert into profiles/customers/cleaners
-- (RLS blocks an unauthenticated insert). Instead the signup carries all profile
-- fields in raw_user_meta_data, and this SECURITY DEFINER trigger creates the
-- rows server-side at signup time. Rows exist immediately; the user just can't
-- sign in until they confirm their email.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := coalesce(meta->>'role', 'customer');
begin
  -- profiles row for every user
  insert into public.profiles (id, role, full_name, phone)
  values (new.id, v_role, meta->>'full_name', meta->>'phone')
  on conflict (id) do nothing;

  if v_role = 'customer' then
    insert into public.customers (id, bio, address, lat, lng, preferred_service_type)
    values (
      new.id,
      meta->>'bio',
      meta->>'address',
      nullif(meta->>'lat', '')::float8,
      nullif(meta->>'lng', '')::float8,
      nullif(meta->>'preferred_service_type', '')
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
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
