-- ============================================================================
-- Supabase Schema Migration: Renter Earnings & Hitchhike Transactions
-- Migration Name: 20261118000000_create_renter_earnings_and_hitchhike_transactions.sql
-- ============================================================================

-- 1. Create table: hitchhike_transactions
CREATE TABLE IF NOT EXISTS public.hitchhike_transactions (
    id TEXT PRIMARY KEY,
    ride_id TEXT,
    renter_id TEXT NOT NULL,
    passenger_id TEXT,
    passenger_name TEXT NOT NULL,
    passenger_avatar TEXT,
    passenger_rating NUMERIC(3,1) DEFAULT 5.0,
    vehicle_id TEXT,
    vehicle_name TEXT,
    pickup TEXT NOT NULL,
    dropoff TEXT NOT NULL,
    distance_km NUMERIC(5,2) NOT NULL DEFAULT 2.5,
    duration_mins INTEGER NOT NULL DEFAULT 15,
    rate_per_km NUMERIC(6,2) NOT NULL DEFAULT 25.0,
    fare_amount NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    net_earnings NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    payout_status TEXT NOT NULL DEFAULT 'available' CHECK (payout_status IN ('available', 'pending', 'paid', 'withdrawn', 'processing')),
    payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'bKash', 'Nagad', 'In-App Wallet')),
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create table: renter_earnings (summary & ledger matching owner earnings)
CREATE TABLE IF NOT EXISTS public.renter_earnings (
    id TEXT PRIMARY KEY,
    renter_id TEXT NOT NULL,
    transaction_id TEXT REFERENCES public.hitchhike_transactions(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    passenger_name TEXT NOT NULL,
    vehicle_name TEXT,
    distance_km NUMERIC(5,2) DEFAULT 2.5,
    duration_mins INTEGER DEFAULT 15,
    rate_per_km NUMERIC(6,2) DEFAULT 25.0,
    amount NUMERIC(10,2) NOT NULL,
    payout_status TEXT NOT NULL DEFAULT 'available' CHECK (payout_status IN ('available', 'pending', 'paid', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_hitchhike_tx_renter_id ON public.hitchhike_transactions(renter_id);
CREATE INDEX IF NOT EXISTS idx_hitchhike_tx_created_at ON public.hitchhike_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hitchhike_tx_date ON public.hitchhike_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_hitchhike_tx_payout_status ON public.hitchhike_transactions(payout_status);

CREATE INDEX IF NOT EXISTS idx_renter_earnings_renter_id ON public.renter_earnings(renter_id);
CREATE INDEX IF NOT EXISTS idx_renter_earnings_date ON public.renter_earnings(date DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.hitchhike_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renter_earnings ENABLE ROW LEVEL SECURITY;

-- 5. Permissive Policies for Demo Personas & Authenticated Roles
DROP POLICY IF EXISTS "Public select hitchhike_transactions" ON public.hitchhike_transactions;
CREATE POLICY "Public select hitchhike_transactions" ON public.hitchhike_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert hitchhike_transactions" ON public.hitchhike_transactions;
CREATE POLICY "Public insert hitchhike_transactions" ON public.hitchhike_transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update hitchhike_transactions" ON public.hitchhike_transactions;
CREATE POLICY "Public update hitchhike_transactions" ON public.hitchhike_transactions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete hitchhike_transactions" ON public.hitchhike_transactions;
CREATE POLICY "Public delete hitchhike_transactions" ON public.hitchhike_transactions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public select renter_earnings" ON public.renter_earnings;
CREATE POLICY "Public select renter_earnings" ON public.renter_earnings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert renter_earnings" ON public.renter_earnings;
CREATE POLICY "Public insert renter_earnings" ON public.renter_earnings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update renter_earnings" ON public.renter_earnings;
CREATE POLICY "Public update renter_earnings" ON public.renter_earnings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete renter_earnings" ON public.renter_earnings;
CREATE POLICY "Public delete renter_earnings" ON public.renter_earnings FOR DELETE USING (true);

-- 6. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.hitchhike_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.renter_earnings;

-- 7. Initial Seed Data for Demo Persona Tahsin Ahmed (u_renter)
INSERT INTO public.hitchhike_transactions (
    id, ride_id, renter_id, passenger_id, passenger_name, passenger_avatar, passenger_rating,
    vehicle_id, vehicle_name, pickup, dropoff, distance_km, duration_mins, rate_per_km,
    fare_amount, platform_fee, net_earnings, payout_status, payment_method, date, created_at
) VALUES
(
    'htx_seed_1', NULL, 'u_renter', 'u_passenger', 'Tanvir Hossain', 'https://i.pravatar.cc/150?u=tanvir', 5.0,
    'v1', 'Yamaha R15 V3', 'TSC, Dhaka University', 'Shahbagh Square', 2.8, 14, 71.4,
    200.00, 0.00, 200.00, 'available', 'Cash', '2026-08-08', '2026-08-08T14:30:00Z'
),
(
    'htx_seed_2', NULL, 'u_renter', 'u_passenger', 'Nusrat Jahan', 'https://i.pravatar.cc/150?u=nusrat', 5.0,
    'v3', 'Honda CB300R', 'Curzon Hall', 'New Market Gate 1', 3.5, 18, 51.4,
    180.00, 0.00, 180.00, 'available', 'Cash', '2026-08-05', '2026-08-05T16:15:00Z'
),
(
    'htx_seed_3', 'ride_3c50d157-0e11-4b22-bbaa-37196e115fc0', 'u_renter', 'u_passenger', 'Ayesha Rahman', 'https://i.pravatar.cc/150?u=ayesha', 4.8,
    'v2', 'Suzuki Gixxer SF', 'Iub', 'Uttara', 4.2, 20, 71.4,
    300.00, 0.00, 300.00, 'available', 'Cash', '2026-08-26', '2026-08-26T18:29:36.421Z'
),
(
    'htx_seed_4', 'ride_b2d8b835-80b4-4f79-bd66-81afce3f783b', 'u_renter', 'u_passenger', 'Ayesha Rahman', 'https://i.pravatar.cc/150?u=ayesha', 4.8,
    'v1', 'Yamaha R15 V3', 'Iub', 'Uttara', 5.0, 22, 100.0,
    500.00, 0.00, 500.00, 'paid', 'bKash', '2026-08-27', '2026-08-27T03:54:16.600Z'
),
(
    'htx_seed_5', 'ride_9daa95f7-070f-4c04-a7ef-dd253779f674', 'u_renter', 'u_passenger', 'Ayesha Rahman', 'https://i.pravatar.cc/150?u=ayesha', 4.8,
    'v_1795024376552', 'ENGWE M20 3.0', 'Uttara', 'Iub', 3.8, 18, 52.6,
    200.00, 0.00, 200.00, 'available', 'Cash', '2026-11-18', '2026-11-18T17:54:55.111Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.renter_earnings (
    id, renter_id, transaction_id, date, passenger_name, vehicle_name,
    distance_km, duration_mins, rate_per_km, amount, payout_status, created_at
) VALUES
('re_seed_1', 'u_renter', 'htx_seed_1', '2026-08-08', 'Tanvir Hossain', 'Yamaha R15 V3', 2.8, 14, 71.4, 200.00, 'available', '2026-08-08T14:30:00Z'),
('re_seed_2', 'u_renter', 'htx_seed_2', '2026-08-05', 'Nusrat Jahan', 'Honda CB300R', 3.5, 18, 51.4, 180.00, 'available', '2026-08-05T16:15:00Z'),
('re_seed_3', 'u_renter', 'htx_seed_3', '2026-08-26', 'Ayesha Rahman', 'Suzuki Gixxer SF', 4.2, 20, 71.4, 300.00, 'available', '2026-08-26T18:29:36.421Z'),
('re_seed_4', 'u_renter', 'htx_seed_4', '2026-08-27', 'Ayesha Rahman', 'Yamaha R15 V3', 5.0, 22, 100.0, 500.00, 'paid', '2026-08-27T03:54:16.600Z'),
('re_seed_5', 'u_renter', 'htx_seed_5', '2026-11-18', 'Ayesha Rahman', 'ENGWE M20 3.0', 3.8, 18, 52.6, 200.00, 'available', '2026-11-18T17:54:55.111Z')
ON CONFLICT (id) DO NOTHING;
