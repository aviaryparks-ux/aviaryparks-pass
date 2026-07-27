const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const parts = line.split('=');
  if(parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/['"]/g, '');
  }
});
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { error } = await supabaseAdmin.rpc('reload_schema', {});
  // fallback if no such rpc exists
  console.log('Schema reload attempted.', error);
}
run();
