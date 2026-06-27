-- Lets a customer dismiss a declined/cancelled booking from their "Refused &
-- cancelled" list once they've seen it ("Mark as seen"), so the card drops off
-- instead of lingering. Defaults false so existing inactive bookings still show
-- until acknowledged.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_ack_inactive boolean NOT NULL DEFAULT false;
