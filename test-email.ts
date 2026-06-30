import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function main() {
  console.log('Testing Supabase query...');
  const { data, error } = await supabaseAdmin.from('members').select('id').limit(1);
  console.log('Members query result:', error || data);

  console.log('Testing email_otps insert...');
  const { error: insertError } = await supabaseAdmin.from('email_otps').insert({
    email: 'test@example.com',
    otp: '123456',
    expires_at: new Date(Date.now() + 10*60000).toISOString(),
    used: false,
    ip_address: '127.0.0.1'
  });
  console.log('Insert error:', insertError || 'Success!');

  console.log('Testing Nodemailer...');
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'dgrabb88@gmail.com',
      subject: 'Test Email',
      text: 'Test',
    });
    console.log('Email sent:', info);
  } catch (e) {
    console.error('Email error:', e);
  }
}

main();
