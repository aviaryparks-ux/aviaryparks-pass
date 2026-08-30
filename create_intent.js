import { supabaseAdmin } from './src/lib/supabaseAdmin';

async function createTable() {
  const { error } = await supabaseAdmin.rpc('run_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS wahana_topup_intents (
        merchant_order_id VARCHAR(50) PRIMARY KEY,
        member_id UUID NOT NULL,
        wahana_id UUID NOT NULL,
        quantity INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });
  console.log('Result:', error);
}

createTable();
