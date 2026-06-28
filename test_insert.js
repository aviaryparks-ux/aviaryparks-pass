// test_insert.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log("Fetching a member to test with...");
  const { data: members, error: mErr } = await supabase.from('members').select('id, name, status').limit(1);
  if (mErr || !members.length) {
    console.error("Could not fetch member", mErr);
    return;
  }
  const member = members[0];
  console.log("Found member", member);

  console.log("Attempting to insert visit...");
  const { data, error } = await supabase.from('visits').insert([{
    member_id: member.id,
    status: 'SUCCESS'
  }]);

  if (error) {
    console.error("Insert failed with error:", error);
  } else {
    console.log("Insert succeeded!", data);
  }
}

testInsert();
