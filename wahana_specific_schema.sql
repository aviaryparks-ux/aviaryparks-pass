-- 1. Create table for Master Data Wahana
CREATE TABLE IF NOT EXISTS wahanas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  topup_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some default Wahanas just for testing
INSERT INTO wahanas (name, description, topup_price) VALUES 
('Mini Train', 'Wahana kereta mengelilingi taman', 20000),
('Feeding Bird', 'Beri makan burung eksotis', 35000),
('Pony Ride', 'Wahana menunggang kuda poni', 50000)
ON CONFLICT DO NOTHING;

-- 2. Create join table for Ticket Packages -> Wahanas
CREATE TABLE IF NOT EXISTS package_wahanas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES ticket_packages(id) ON DELETE CASCADE,
  wahana_id UUID NOT NULL REFERENCES wahanas(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_id, wahana_id) -- ensure no duplicate wahana mapping for a single package
);

-- 3. Alter member_wahana_vouchers to add wahana_id
-- We add the column and make it a foreign key.
ALTER TABLE member_wahana_vouchers 
ADD COLUMN wahana_id UUID REFERENCES wahanas(id) ON DELETE CASCADE;

-- Also we might want to update the voucher_transactions to track WHICH wahana was topped up.
ALTER TABLE voucher_transactions
ADD COLUMN wahana_id UUID REFERENCES wahanas(id) ON DELETE CASCADE;

-- 4. Update Global System Settings (Remove unused keys, keep validity)
UPDATE system_settings
SET value = '{"validity_days": 30}'::jsonb,
    description = 'Pengaturan global masa aktif voucher wahana (hari)'
WHERE id = 'wahana_vouchers';
