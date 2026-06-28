import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSelect() {
  const { data, error } = await supabase.from('members').select('*');
  
  if (error) {
    console.error("Select failed:", error);
  } else {
    console.log("Members:", JSON.stringify(data, null, 2));
  }
}

testSelect();
