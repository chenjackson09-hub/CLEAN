-- Track whether the customer booked with a flexible ("Not sure") duration.
-- When a customer picks "Not sure" in the booking form, we still store a
-- concrete 2-hour default (so availability/carving math works) but set this
-- flag so the cleaner sees a "Not sure" marker next to the duration instead of
-- a note buried in the booking notes. The cleaner resolves it by editing the
-- booking to a concrete duration, which clears the flag.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS duration_flexible boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
