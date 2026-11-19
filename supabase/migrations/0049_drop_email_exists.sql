-- ============================================================================
-- 0049_drop_email_exists.sql
--
-- Removes public.email_exists(text) (migration 0020). It was callable by anyone,
-- signed out, and answered "does this email have an account?" — which let a
-- stranger test any list of addresses. The register page no longer uses it:
-- an address that is already registered now looks exactly like a new one.
--
-- RUN THIS ONLY AFTER the new register page is live (deploy first). While the
-- old page is still live it calls this function and would stop sign-ups.
--
-- Apply by hand in the Supabase SQL Editor. Safe to run more than once.
-- ============================================================================

drop function if exists public.email_exists(text);

NOTIFY pgrst, 'reload schema';
