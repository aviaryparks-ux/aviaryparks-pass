-- 1. Create table for System Settings (Harga & Kuota)
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default voucher settings
INSERT INTO system_settings (id, value, description) 
VALUES (
  'wahana_vouchers', 
  '{"initial_amount": 5, "price_per_voucher": 50000, "validity_days": 30}', 
  'Pengaturan default untuk voucher wahana (kuota awal, harga top-up, masa aktif)'
) ON CONFLICT (id) DO NOTHING;


-- 2. Create table for Member Vouchers (Barcode Based)
CREATE TABLE IF NOT EXISTS member_wahana_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  barcode VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'USED', 'EXPIRED'
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast barcode scanning
CREATE INDEX IF NOT EXISTS idx_voucher_barcode ON member_wahana_vouchers(barcode);


-- 3. Create table for Voucher Transactions (Top-Up History)
CREATE TABLE IF NOT EXISTS voucher_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'INITIAL_GIFT', 'TOPUP_PURCHASE'
  quantity INTEGER NOT NULL,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop or ignore old tables if needed (Optional depending on if there's old data to keep)
-- DROP TABLE IF EXISTS point_mutations CASCADE;
-- DROP TABLE IF EXISTS rewards_catalog CASCADE;
-- DROP TABLE IF EXISTS member_vouchers CASCADE; 
