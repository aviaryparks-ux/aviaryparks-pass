const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from('members').select('id, name, status, group_id').order('created_at', { ascending: false });
  console.log(JSON.stringify(data, null, 2));
}
run();
