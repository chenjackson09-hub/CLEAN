-- ============================================================================
-- 0014_booking_avail_window.sql
--
-- The customer's availability window for a booking: the broader span they're
-- free in, separate from the requested start time + duration. Lets a customer
-- order (say) a 3-hour clean while telling the cleaner they're free for a 6-hour
-- window, so the cleaner can offer to extend.
--
-- Both nullable (a booking made without a window leaves them null). Apply by hand
-- in the Supabase SQL Editor.
-- ============================================================================

alter table public.bookings add column if not exists avail_window_start time;
alter table public.bookings add column if not exists avail_window_end   time;

NOTIFY pgrst, 'reload schema';
