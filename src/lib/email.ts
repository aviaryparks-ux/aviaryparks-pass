import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendPaymentReceiptEmail = async (to: string, name: string, groupId: string, packageName: string, amount: number) => {
  try {
    const shortGroupId = groupId.split('-')[0].toUpperCase();
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    
    await transporter.sendMail({
      from: '"Aviary Park" <no-reply@aviarypark.com>',
      to,
      subject: `Resi Pembayaran Tiket Aviary Park - ${shortGroupId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Pembayaran Berhasil! 🎉</h1>
          </div>
          <p style="font-size: 16px; color: #334155;">Halo <strong>${name}</strong>,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">
            Terima kasih telah bergabung! Pembayaran Anda telah berhasil kami verifikasi. Berikut adalah rincian tiket Anda:
          </p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 16px;">Rincian Pembayaran</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Nomor Registrasi</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${shortGroupId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Paket Tiket</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${packageName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 16px; margin-top: 8px;">Total Pembayaran</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981; font-size: 18px; border-top: 1px dashed #cbd5e1; padding-top: 16px; margin-top: 8px;">${formattedAmount}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://bad-cheetah-86.loca.lt'}/login" style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Masuk ke Dasbor Pengunjung
            </a>
          </div>
          
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">
            Langkah selanjutnya:<br/>
            1. Klik tombol di atas untuk masuk ke Dasbor.<br/>
            2. Daftarkan wajah Anda (Face Biometric) untuk akses masuk tanpa tiket fisik.
          </p>
          <p style="font-size: 16px; color: #334155; margin-top: 32px;">
            Sampai jumpa di Aviary Park Indonesia!<br/>
            <strong>Tim Aviary Park</strong>
          </p>
        </div>
    console.error('Error sending payment email:', error);
  }
};

export const sendVisitNotificationEmail = async (email: string, name: string, location: string) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #f59e0b; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Selamat Datang! 🦜</h1>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #334155;">Halo <strong>${name}</strong>,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">
            Kami mencatat Anda baru saja masuk melalui <strong>${location}</strong> dengan menggunakan Face Biometric.
          </p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">
            Semoga Anda dan keluarga memiliki hari yang menyenangkan dan penuh petualangan di Aviary Park Indonesia! Jangan ragu untuk menghubungi staf kami jika Anda membutuhkan bantuan.
          </p>
          <p style="font-size: 16px; color: #334155; margin-top: 32px;">
            Salam Hangat,<br/>
            <strong>Tim Aviary Park</strong>
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: '"Aviary Park Indonesia" <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'Selamat Datang di Aviary Park!',
      html
    });
    console.log(`Visit email sent to ${email}`);
  } catch (error) {
    console.error('Error sending visit email:', error);
  }
};
