-- ============================================================================
-- 0020_email_exists_check.sql
--
-- Lets the (unauthenticated) /register page tell a visitor "this email is
-- already registered" before they fill out the rest of the signup flow,
-- instead of only finding out after answering every wizard question.
--
-- auth.users isn't reachable from the client under RLS, so this is a
-- SECURITY DEFINER function — unlike the other SECURITY DEFINER helpers in
-- this codebase (0010/0011/0015), it's deliberately granted to anon +
-- authenticated, since it must be callable from the pre-login register page.
--
-- Apply by hand in the Supabase SQL Editor (no CLI linked).
-- ============================================================================

create or replace function public.email_exists(check_email text)
  returns boolean
  language sql
  security definer
  stable
  set search_path to 'public'
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(check_email)
  );
$$;

grant execute on function public.email_exists(text) to anon, authenticated;

-- Refresh PostgREST's schema cache so the new RPC function is visible.
NOTIFY pgrst, 'reload schema';
