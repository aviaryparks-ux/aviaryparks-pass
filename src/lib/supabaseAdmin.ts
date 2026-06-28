import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
// We use the service role key to bypass RLS in secure backend routes
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL or Service Role Key is missing. Backend secure operations may fail.');
}

export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '');
