-- ============================================================================
-- 0000b_auth_trigger.sql
--
-- The signup trigger lives on auth.users, which is OUTSIDE the public schema,
-- so it is NOT captured by `pg_dump -n public` (0000_base_schema.sql). The
-- handle_new_user() FUNCTION is in the base schema; this file wires the TRIGGER
-- that calls it. Run AFTER 0000_base_schema.sql.
--
-- (Identical to the trigger half of 0004_handle_new_user.sql.)
-- ============================================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
