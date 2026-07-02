-- Languages the customer speaks, shown to cleaners so they can gauge fit.
-- Mirrors cleaners.languages: an array of short native-script codes
-- (English "EN", Hebrew "עב", …) — see lib/languages.ts. Non-null with an
-- empty-array default so reads never come back null.
alter table public.customers
  add column if not exists languages text[] not null default '{}';

-- PostgREST caches the schema; without this the new column reads as
-- "not found in the schema cache" even though it exists.
notify pgrst, 'reload schema';
