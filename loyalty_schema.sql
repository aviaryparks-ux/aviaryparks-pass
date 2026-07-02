-- Run this SQL in your Supabase SQL Editor

-- 1. Create table for Rewards Catalog
CREATE TABLE IF NOT EXISTS rewards_catalog (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type VARCHAR(50) NOT NULL, -- e.g., 'VOUCHER_50K', 'FREE_RIDE'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create table for POS Transactions (Tracking Spend)
CREATE TABLE IF NOT EXISTS pos_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  location VARCHAR(100) NOT NULL, -- 'RESTO', 'SOUVENIR', 'RIDES'
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create table for Point Mutations
CREATE TABLE IF NOT EXISTS point_mutations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  member_id UUID NOT NULL,
  mutation_type VARCHAR(50) NOT NULL, -- 'EARN', 'REDEEM'
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add points_balance to existing members 
ALTER TABLE members ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;

-- Optional: Insert initial rewards
INSERT INTO rewards_catalog (name, description, points_required, reward_type) VALUES
('Voucher Potongan Rp 50.000', 'Berlaku di semua outlet F&B dan Souvenir', 100, 'VOUCHER_50K'),
('Gratis 1 Tiket Wahana', 'Berlaku untuk Animal Encounter', 300, 'FREE_RIDE'),
('Perpanjangan Annual Pass 1 Bulan', 'Tambahan 30 hari masa aktif', 500, 'EXTEND_PASS');

-- 5. Create table for POS Terminals
CREATE TABLE IF NOT EXISTS pos_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('RESTO', 'SOUVENIR', 'WAHANA')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO pos_terminals (name, category) VALUES 
('?? Restoran & Cafe (F&B)', 'RESTO'), 
('?? Toko Merchandise (Souvenir)', 'SOUVENIR'), 
('?? Wahana Bermain (Wahana)', 'WAHANA');
