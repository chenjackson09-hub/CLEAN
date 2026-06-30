-- ============================================================================
-- 0010_security_lints.sql
--
-- Addresses the Supabase database-linter SECURITY warnings (all WARN/EXTERNAL).
-- Every change here is safe for the running app:
--   * The two storage policies dropped only governed the authenticated *list*
--     API; public buckets still serve objects by URL via getPublicUrl().
--   * handle_new_user() / rls_auto_enable() are TRIGGER functions — triggers
--     fire regardless of EXECUTE grants, so revoking the RPC grant doesn't stop
--     signup row-creation or Supabase's auto-RLS.
--   * st_estimatedextent() is a PostGIS extent estimator the app never calls
--     (we read locations as EWKB and write WKT POINT strings).
--
-- NOT handled here (need a dashboard toggle / a deliberate decision — see the
-- notes at the bottom): leaked-password protection and moving the postgis
-- extension out of the public schema.
-- ============================================================================

-- 1. public_bucket_allows_listing (avatars, gallery) -------------------------
-- These broad SELECT policies let any client enumerate every file in the
-- bucket via the list API. Public buckets don't need a SELECT policy for
-- object-URL access, so drop them. Owner write policies stay untouched.
drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "Public read gallery" on storage.objects;

-- 2. anon/authenticated_security_definer_function_executable -----------------
-- Stop these SECURITY DEFINER functions from being callable via /rest/v1/rpc.
-- Both are trigger functions, so this does not affect their normal operation.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;

-- PostGIS extent estimator — exposed as an RPC only because postgis lives in
-- public. The app never calls it; revoke the public-facing grants.
revoke execute on function public.st_estimatedextent(text, text) from anon, authenticated, public;
revoke execute on function public.st_estimatedextent(text, text, text) from anon, authenticated, public;
revoke execute on function public.st_estimatedextent(text, text, text, boolean) from anon, authenticated, public;

-- Reload PostgREST's schema cache so the RPC list reflects the revoked grants.
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- STILL OPEN — do these in the Supabase dashboard (no SQL here):
--
--   * auth_leaked_password_protection — Dashboard → Authentication → Policies
--     (Password security) → enable "Leaked password protection" (HaveIBeenPwned).
--
--   * extension_in_public (postgis) — moving an already-installed PostGIS
--     extension out of `public` is risky on managed Postgres (it can break the
--     geometry types backing cleaners.location). Left in place deliberately;
--     the st_estimatedextent grants revoked above remove the practical RPC
--     exposure. Only relocate postgis with a tested, reversible plan.
-- ============================================================================
