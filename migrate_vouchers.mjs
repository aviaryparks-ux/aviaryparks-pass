import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  console.log('Starting migration...');
  
  const sql = `
    -- 1. Drop existing member_wahana_vouchers table because the schema completely changed
    DROP TABLE IF EXISTS member_wahana_vouchers CASCADE;

    -- 2. Re-create member_wahana_vouchers with quota
    CREATE TABLE member_wahana_vouchers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      wahana_id UUID NOT NULL REFERENCES wahanas(id) ON DELETE CASCADE,
      quota INTEGER NOT NULL DEFAULT 0,
      valid_until TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(member_id, wahana_id)
    );

    -- 3. Drop existing voucher_transactions
    DROP TABLE IF EXISTS voucher_transactions CASCADE;

    -- 4. Re-create voucher_transactions with quota_change
    CREATE TABLE voucher_transactions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      wahana_id UUID NOT NULL REFERENCES wahanas(id) ON DELETE CASCADE,
      mutation_type VARCHAR(50) NOT NULL,
      quota_change INTEGER NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const { data, error } = await supabase.rpc('run_sql', { sql });
  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Migration successful:', data);
  }
}

migrate();
