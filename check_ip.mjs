import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('email_otps')
    .select('ip_address')
    .limit(1);
    
  if (error) {
    console.log('COLUMN DOES NOT EXIST:', error.message);
  } else {
    console.log('COLUMN EXISTS!');
  }
}

check();
