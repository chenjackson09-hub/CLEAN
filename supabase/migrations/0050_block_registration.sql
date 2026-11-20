-- Blocked people can no longer create a new account.
--
-- Until now deleting a person (or rejecting a cleaner application) only RECORDED their email
-- on `blocked_users`; nothing stopped them from registering again. This adds the check at the
-- one place every new account passes through — the insert into auth.users — so it covers
-- email sign-up, Google sign-up and anyone calling the sign-up service directly.
--
-- Matching is by email, case-insensitive. (`me+1@gmail.com` is a different address from
-- `me@gmail.com`; matching those would also block your own plus-address test accounts.)
-- Unblocking someone from /admin/blocked removes the row, so they can register again.
-- The person sees a neutral "we couldn't create this account" message, never the reason.
--
-- Only NEW accounts are checked: an existing account is never touched by this.
-- Apply by hand in the Supabase SQL Editor.

create index if not exists blocked_users_email_lower_idx
  on public.blocked_users (lower(email));

create or replace function public.block_blocked_registration()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if new.email is not null
     and exists (
       select 1 from public.blocked_users b
       where b.email is not null and lower(b.email) = lower(new.email)
     )
  then
    raise exception 'registration_not_allowed';
  end if;
  return new;
end;
$function$;

revoke execute on function public.block_blocked_registration() from public, anon, authenticated;

drop trigger if exists block_blocked_registration on auth.users;
create trigger block_blocked_registration
  before insert on auth.users
  for each row execute function public.block_blocked_registration();

notify pgrst, 'reload schema';
