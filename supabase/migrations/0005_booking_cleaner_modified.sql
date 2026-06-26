-- Track whether the cleaner has edited a booking after it was created. Cleaners
-- can adjust a still-pending request or an already-accepted clean (changing the
-- start time / duration, or appending a note) from /cleaner/requests and the
-- dashboard. When they do, this flag is set so the customer's /bookings view can
-- surface a "modified by the cleaner" indicator on that booking.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cleaner_modified boolean NOT NULL DEFAULT false;
