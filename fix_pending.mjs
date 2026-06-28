import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  const { data, error } = await supabase
    .from('members')
    .update({ 
      status: 'ACTIVE',
      activation_date: new Date().toISOString()
    })
    .eq('status', 'PENDING_PAYMENT');
    
  if (error) {
    console.log('Error updating:', error.message);
  } else {
    console.log('Successfully updated pending members to ACTIVE!');
  }
}

fix();
