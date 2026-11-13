-- ====================================================================
-- BAKER'S NATION: RESET ALL ORDERS & RESTART ORDER NUMBERING FROM #1
-- ====================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/wmkclatrhlsqktvgklyc
-- 2. Go to "SQL Editor" on the left menu.
-- 3. Paste and run the command below:
-- ====================================================================

TRUNCATE TABLE public.orders RESTART IDENTITY CASCADE;

-- Verification query (should return 0 rows):
SELECT count(*) as total_orders FROM public.orders;

