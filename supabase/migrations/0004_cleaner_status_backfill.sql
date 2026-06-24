-- Backfill existing cleaners onto the new status values (separate migration
-- from 0003's ADD VALUE so the new enum labels are committed first --
-- Postgres disallows using a brand-new enum value in the same transaction
-- that added it).
UPDATE cleaners SET status = 'new' WHERE status = 'pending';
UPDATE cleaners SET status = 'active' WHERE status = 'approved';
UPDATE cleaners SET status = 'blocked' WHERE status IN ('rejected', 'suspended');
