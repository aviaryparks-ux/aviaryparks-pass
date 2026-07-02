import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yukmvapygeffilnfjlki.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1a212YXB5Z2VmZmlsbmZqbGtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA5NDgyNCwiZXhwIjoyMDk3NjcwODI0fQ.-7vYJ8Yxr9lCjguFZxvuqKYEjXai-hE1pyYoDgQAhz8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('ticket_packages').select('*').limit(1);
  console.log(data);
}
run();
