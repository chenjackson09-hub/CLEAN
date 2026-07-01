-- Blocked users list.
--
-- When an admin deletes a cleaner/customer or rejects a cleaner application, we
-- snapshot the person's identity (name / email / phone) here so they stay on a
-- block list even after their profile/auth row is removed. Written only by the
-- service-role admin client (see app/admin/actions.ts), so RLS is enabled with
-- no policies — anon/authenticated can't read or write it.

create table if not exists public.blocked_users (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text unique,          -- nullable; multiple NULLs allowed by Postgres
  phone      text,
  role       text,                 -- 'cleaner' | 'customer'
  reason     text,                 -- 'deleted' | 'rejected'
  blocked_at timestamptz not null default now()
);

alter table public.blocked_users enable row level security;

-- Make the new table visible to PostgREST immediately.
notify pgrst, 'reload schema';
