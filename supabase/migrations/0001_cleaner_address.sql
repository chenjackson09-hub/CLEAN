-- Persist the cleaner's typed base address (previously only the derived
-- geography point was stored, so the address couldn't be shown, edited, or
-- re-geocoded). Mirrors customers.address.
ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS address text;
