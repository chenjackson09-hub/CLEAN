-- ============================================================================
-- 0000c_storage.sql
--
-- Storage buckets + RLS policies. These live in the `storage` schema, so they
-- are NOT in the public-schema dump (0000_base_schema.sql). Run AFTER it.
--
-- Two buckets, both PUBLIC-read (the app serves photos via getPublicUrl):
--   * avatars  -- cleaner & customer profile photos, path: {user_id}/avatar.ext
--   * gallery  -- cleaner work photos,               path: {user_id}/{ts}.ext
--
-- Write access is scoped so a user can only touch files inside their own
-- {user_id}/ folder, matching how app/(cleaner)/actions.ts and
-- app/(customer)/actions.ts build upload paths.
-- ============================================================================

-- Buckets (idempotent) ------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- Public read ---------------------------------------------------------------
drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Public read gallery" on storage.objects;
create policy "Public read gallery"
  on storage.objects for select
  using (bucket_id = 'gallery');

-- Owner write (insert/update/delete) within own {user_id}/ folder ----------
drop policy if exists "Users manage own avatar" on storage.objects;
create policy "Users manage own avatar"
  on storage.objects for all to authenticated
  using      (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Cleaners manage own gallery files" on storage.objects;
create policy "Cleaners manage own gallery files"
  on storage.objects for all to authenticated
  using      (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);
