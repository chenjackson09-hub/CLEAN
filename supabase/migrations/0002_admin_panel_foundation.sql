-- Foundation for the admin panel rebuild (Chen's spec): notes columns the
-- admin UI can actually persist to, a third application status so "needs
-- info" doesn't have to overload reject/pending, and a generic audit log
-- for Matching Queue actions (Notify cleaners, etc.) added in a later phase.

ALTER TABLE cleaners ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'needs_info';

CREATE TABLE IF NOT EXISTS admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
