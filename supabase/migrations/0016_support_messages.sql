-- ============================================================================
-- 0016_support_messages.sql
--
-- Backs the floating "Need help? Contact us!" widget shown on every cleaner and
-- customer page. A signed-in user types a message and sends it; the row lands
-- here and admins read/resolve it from /admin/support.
--
--   * user_id    — who sent it (profiles FK, cascade so it clears with the user)
--   * user_role  — snapshot of their role at send time ('cleaner' | 'customer'),
--                  denormalized so the admin inbox needn't join to tell them
--                  apart even if the role later changes
--   * message    — the free text
--   * resolved   — admins flip this from the inbox once handled
--
-- RLS: a user may INSERT only their own row (user_id = auth.uid()) and cannot
-- read the table at all. The admin inbox reads/updates via the service-role
-- client (createAdminClient), which bypasses RLS — same pattern as the other
-- admin-only surfaces.
--
-- NOTE: git branches share one Supabase project and the migration-history table
-- is flat — confirm 0016 is actually the next free number with
-- `supabase migration list` before pushing, and renumber if it collides.
--
-- Apply by hand in the Supabase SQL Editor (no CLI linked). The app errors on
-- the new table until this runs.
-- ============================================================================

create table if not exists public.support_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  user_role  text not null,
  message    text not null,
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Newest-first inbox reads.
create index if not exists support_messages_created_at_idx
  on public.support_messages (created_at desc);

alter table public.support_messages enable row level security;

-- A user may only file their own message; nobody may read via anon/auth (the
-- admin inbox uses the service-role client, which bypasses RLS).
drop policy if exists "user inserts own support message" on public.support_messages;
create policy "user inserts own support message"
  on public.support_messages
  for insert
  with check (user_id = auth.uid());

-- Refresh PostgREST's schema cache so the new table is visible.
NOTIFY pgrst, 'reload schema';
