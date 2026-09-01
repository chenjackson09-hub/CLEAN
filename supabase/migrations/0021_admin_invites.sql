-- Admin invite links: lets an existing admin generate a one-time, expiring
-- link that another person can use to self-register a clean admin account.
-- handle_new_user (0004) already skips both the customers and cleaners
-- branches for role='admin', so an account created this way carries no
-- leftover cleaner/customer rows.

create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles(id)
);

alter table public.admin_invites enable row level security;
-- No policies — only the service-role admin client reads/writes this table,
-- same pattern as blocked_users/support_messages.

notify pgrst, 'reload schema';
