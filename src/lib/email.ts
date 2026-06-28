import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendPaymentReceiptEmail = async (email: string, name: string, groupId: string, packageName: string) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #059669; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Pembayaran Berhasil! 🎉</h1>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #334155;">Halo <strong>${name}</strong>,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">
            Terima kasih telah bergabung! Pembayaran Anda untuk <strong>${packageName}</strong> telah berhasil kami verifikasi.
          </p>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">Nomor Registrasi Anda (Group ID):</p>
            <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: bold; color: #0f172a; letter-spacing: 2px;">${groupId}</p>
          </div>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">
            Langkah selanjutnya:<br/>
            1. Kunjungi website Aviary Park.<br/>
            2. Masuk ke Dasbor Pengunjung.<br/>
            3. Daftarkan wajah Anda (Face Biometric) untuk akses masuk tanpa tiket fisik.
          </p>
          <p style="font-size: 16px; color: #334155; margin-top: 32px;">
            Sampai jumpa di Aviary Park Indonesia!<br/>
            <strong>Tim Aviary Park</strong>
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: '"Aviary Park Indonesia" <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'Pembayaran Berhasil - Tiket Aviary Park',
      html
    });
    console.log(`Payment email sent to ${email}`);
  } catch (error) {
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
