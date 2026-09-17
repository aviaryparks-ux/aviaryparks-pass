-- ==============================================================================
-- AVIARY PARK ANNUAL PASS - MASTER PRODUCTION DATABASE SCHEMA (SUPABASE 2026)
-- Sesuai Regulasi UU PDP No. 27/2022 & Standar Keamanan ISO 27001
-- Fitur: Full RLS Protection, AI Face Vector (pgvector), POS, Loyalty, Audit Logs
-- ==============================================================================

-- 1. EKSTENSI WAJIB
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ==============================================================================
-- 2. TABEL SYSTEM USERS (Admin, Kasir, Petugas Gate)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS system_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'GATE', -- 'ADMIN', 'KASIR', 'GATE'
  wahana_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Admin & Petugas Gate (Password Default: 'admin123')
INSERT INTO system_users (username, password, role) VALUES
('admin', '$2a$12$EIXZsI5aOI6l/K2d.jQJteO7T4xR3M508.e8WlJ5zU0y7/C7j.SFe', 'ADMIN'),
('gate_utama', '$2a$12$EIXZsI5aOI6l/K2d.jQJteO7T4xR3M508.e8WlJ5zU0y7/C7j.SFe', 'GATE'),
('kasir_resto', '$2a$12$EIXZsI5aOI6l/K2d.jQJteO7T4xR3M508.e8WlJ5zU0y7/C7j.SFe', 'KASIR')
ON CONFLICT (username) DO NOTHING;

-- ==============================================================================
-- 3. TABEL MASTER WAHANA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS wahanas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  topup_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Master Wahana Aviary Park
INSERT INTO wahanas (name, description, topup_price) VALUES 
('Mini Train', 'Wahana keliling taman kereta mini santai', 25000),
('Bird Feeding', 'Interaksi dan memberi makan burung eksotis', 35000),
('Pony Ride', 'Wahana menunggang kuda poni untuk anak', 50000),
('Rabbit Feeding', 'Memberi makan kelinci jinak di taman', 25000)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 4. TABEL PAKET TIKET (Annual Pass & Bundling POS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ticket_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  min_qty INTEGER NOT NULL DEFAULT 1,
  max_qty INTEGER NOT NULL DEFAULT 1,
  category VARCHAR(50) NOT NULL DEFAULT 'MEMBERSHIP', -- 'MEMBERSHIP', 'BUNDLING', 'TOPUP_BUNDLE'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Paket Tiket Default
INSERT INTO ticket_packages (name, description, price, min_qty, max_qty, category) VALUES
('Annual Pass Personal (1 Orang)', 'Akses tak terbatas 365 hari untuk 1 orang', 350000, 1, 1, 'MEMBERSHIP'),
('Annual Pass Family 2 (2 Orang)', 'Akses tak terbatas 365 hari untuk 2 orang keluarga', 650000, 2, 2, 'MEMBERSHIP'),
('Annual Pass Family 4 (4 Orang)', 'Akses tak terbatas 365 hari untuk 4 orang keluarga', 1200000, 4, 4, 'MEMBERSHIP')
ON CONFLICT DO NOTHING;

-- Relasi Paket ke Kuota Wahana Gratis
CREATE TABLE IF NOT EXISTS package_wahanas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES ticket_packages(id) ON DELETE CASCADE,
  wahana_id UUID NOT NULL REFERENCES wahanas(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_id, wahana_id)
);

-- Hubungkan Paket Family ke Kuota Wahana Gratis
DO $$
DECLARE
  v_pkg_id UUID;
  v_w1 UUID;
  v_w2 UUID;
BEGIN
  SELECT id INTO v_pkg_id FROM ticket_packages WHERE name LIKE '%Family 4%' LIMIT 1;
  SELECT id INTO v_w1 FROM wahanas WHERE name = 'Mini Train' LIMIT 1;
  SELECT id INTO v_w2 FROM wahanas WHERE name = 'Bird Feeding' LIMIT 1;
  IF v_pkg_id IS NOT NULL AND v_w1 IS NOT NULL THEN
    INSERT INTO package_wahanas (package_id, wahana_id, quantity) VALUES (v_pkg_id, v_w1, 2) ON CONFLICT DO NOTHING;
  END IF;
  IF v_pkg_id IS NOT NULL AND v_w2 IS NOT NULL THEN
    INSERT INTO package_wahanas (package_id, wahana_id, quantity) VALUES (v_pkg_id, v_w2, 2) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ==============================================================================
-- 5. TABEL ANGGOTA (MEMBERS) - SESUAI ISO 27001 / UU PDP (TANPA NIK WAJIB)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'PRIMARY', -- 'PRIMARY', 'MEMBER', 'CHILD'
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  birth_date DATE,
  gender VARCHAR(20),
  address TEXT,
  nik VARCHAR(50), -- Opsional (Nullable), tanpa constraint unik ketat
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_PAYMENT', -- 'PENDING_PAYMENT', 'ACTIVE', 'EXPIRED'
  activation_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  photo_url TEXT,
  face_descriptor vector(128), -- Embedding vektor biometrik wajah (128-dimensi)
  card_uid VARCHAR(100), -- UID kartu RFID / Barcode Gelang Calisto
  points_balance INTEGER DEFAULT 0,
  emergency_name VARCHAR(100),
  emergency_phone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_group_id ON members(group_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_card_uid ON members(card_uid);

-- ==============================================================================
-- 6. FUNGSI AI BIOMETRIK (RPC: match_face)
-- ==============================================================================
CREATE OR REPLACE FUNCTION match_face (
  query_embedding vector(128),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    members.id,
    members.name::text,
    1 - (members.face_descriptor <=> query_embedding) AS similarity
  FROM members
  WHERE members.status = 'ACTIVE'
    AND members.face_descriptor IS NOT NULL
    AND 1 - (members.face_descriptor <=> query_embedding) >= match_threshold
  ORDER BY members.face_descriptor <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ==============================================================================
-- 7. TABEL TRANSAKSI PEMBAYARAN TIKET
-- ==============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_order_id VARCHAR(100) NOT NULL UNIQUE,
  group_id UUID NOT NULL,
  package_id UUID REFERENCES ticket_packages(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED'
  payment_url TEXT,
  payment_method VARCHAR(50),
  user_count INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABEL KUNJUNGAN GATE (VISITS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
  location VARCHAR(100) DEFAULT 'Gerbang Utama',
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_member_id ON visits(member_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at);

-- ==============================================================================
-- 9. TABEL VOUCHER WAHANA (KUOTA & TRANSAKSI)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS member_wahana_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  wahana_id UUID NOT NULL REFERENCES wahanas(id) ON DELETE CASCADE,
  barcode VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'USED', 'EXPIRED'
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voucher_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  wahana_id UUID REFERENCES wahanas(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'INITIAL_GIFT', 'TOPUP_PURCHASE'
  quantity INTEGER NOT NULL,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. TABEL POS, POINT LOYALTY & CATALOG
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pos_terminals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('RESTO', 'SOUVENIR', 'WAHANA')),
  wahana_id UUID REFERENCES wahanas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pos_terminals (name, category) VALUES 
('Restoran & Cafe (F&B)', 'RESTO'), 
('Toko Merchandise (Souvenir)', 'SOUVENIR'), 
('Loket Wahana Bermain', 'WAHANA')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS pos_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  location VARCHAR(100) NOT NULL,
  terminal_name TEXT,
  invoice_number VARCHAR(100),
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  image_url TEXT,
  expires_in_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards_catalog(id),
  voucher_code VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS point_mutations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  mutation_type VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. TABEL KONTEN, AUDIT & LOGGING
-- ==============================================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  event_date DATE NOT NULL,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(100),
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES system_users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  target_table VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  user_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (id, value, description) VALUES 
('wahana_vouchers', '{validity_days: 30}', 'Pengaturan global masa aktif voucher wahana (hari)')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS email_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  otp VARCHAR(10) NOT NULL,
  ip_address VARCHAR(50),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. KEAMANAN TINGGI: ROW LEVEL SECURITY (RLS) - HILANGKAN 'UNRESTRICTED'
-- ==============================================================================
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wahanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_wahanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_wahana_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;

-- Policy Publik: Hanya membaca info umum (Paket, Wahana, Event, Jadwal)
CREATE POLICY "Public read ticket packages" ON ticket_packages FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Public read wahanas" ON wahanas FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Public read package wahanas" ON package_wahanas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read events" ON events FOR SELECT TO anon, authenticated USING (status = 'ACTIVE');
CREATE POLICY "Public read schedules" ON schedules FOR SELECT TO anon, authenticated USING (status = 'ACTIVE');
