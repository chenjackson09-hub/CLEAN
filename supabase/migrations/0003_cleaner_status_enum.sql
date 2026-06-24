-- Cleaner status terminology per Chen's admin spec: New/Active/In training/
-- Inactive/Blocked, replacing pending/approved/rejected/suspended.
--
-- Postgres can't drop enum values cleanly (would require recreating the
-- type), so the old values stay defined but unused going forward — every
-- row is backfilled to a new value below, and all app code is updated in
-- the same change to only ever read/write the new ones.
ALTER TYPE cleaner_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE cleaner_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE cleaner_status ADD VALUE IF NOT EXISTS 'in_training';
ALTER TYPE cleaner_status ADD VALUE IF NOT EXISTS 'inactive';
ALTER TYPE cleaner_status ADD VALUE IF NOT EXISTS 'blocked';
