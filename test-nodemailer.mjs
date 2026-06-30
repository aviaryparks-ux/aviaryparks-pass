import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 5000,
});

async function testEmail() {
  console.log('Sending test email...');
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'dgrabb88@gmail.com', // or the user's email
      subject: 'Test Email Nodemailer',
      text: 'Test',
    });
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Email error:', error);
  }
}

testEmail();
