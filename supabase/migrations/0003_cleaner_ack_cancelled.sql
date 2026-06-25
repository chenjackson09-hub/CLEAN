-- Track whether the cleaner has acknowledged a booking's cancellation. The
-- cleaner's dashboard surfaces cancellations she didn't initiate (a customer
-- pressed Cancel, or a sibling was auto-cancelled when another cleaner was
-- booked) as an "Updates" section, shown until she dismisses each one with
-- "I have seen this". Cleaner-initiated cancellations (cancelClean) set this to
-- true at cancel time, so they never appear as an update to herself.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cleaner_ack_cancelled boolean NOT NULL DEFAULT false;
