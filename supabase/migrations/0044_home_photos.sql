-- Hosts can add photos of their home. They are PRIVATE: not public, not on any profile page
-- anyone can open. The only way to see someone else's home photos is through the app, which
-- hands a cleaner short-lived links to them ONLY while that cleaner has a live request from the
-- host (pending, accepted or completed).
--
-- Additive: a new column and a new private bucket. Nothing existing changes.

-- 1) Which photos a host has (storage paths inside the private bucket, "<host id>/<file>").
alter table public.customers
  add column if not exists home_photos text[] not null default '{}';

-- 2) A PRIVATE bucket (public = false): there are no permanent public links to these files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('home-photos', 'home-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3) A host can add, see and remove files only inside their OWN folder. Nobody else gets a
--    policy at all - a cleaner is shown a photo through a signed link created by the server
--    after it has checked that the cleaner has a live request from this host.
drop policy if exists "Hosts add their own home photos" on storage.objects;
create policy "Hosts add their own home photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'home-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Hosts see their own home photos" on storage.objects;
create policy "Hosts see their own home photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'home-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Hosts remove their own home photos" on storage.objects;
create policy "Hosts remove their own home photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'home-photos' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
