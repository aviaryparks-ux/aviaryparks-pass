export class NotificationService {
  /**
   * Mengirim notifikasi WhatsApp.
   * Saat ini masih berupa Mock/Simulasi. Siap diganti dengan Wablas/Fonnte API.
   */
  static async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    try {
      // Membersihkan nomor telepon (ubah 0 jadi 62 jika perlu)
      let targetPhone = phone.replace(/[^0-9]/g, '');
      if (targetPhone.startsWith('0')) {
        targetPhone = '62' + targetPhone.substring(1);
      }

      console.log('====================================');
      console.log(`[WHATSAPP] Mengirim ke: ${targetPhone}`);
      console.log(`Pesan:\n${message}`);
      console.log('====================================');

      const token = process.env.FONNTE_TOKEN;
      if (!token) {
        console.warn('FONNTE_TOKEN is not set in environment variables.');
        return false;
      }

      const formData = new FormData();
      formData.append('target', targetPhone);
      formData.append('message', message);
      formData.append('countryCode', '62');

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': token,
        },
        body: formData
      });
      
      const data = await response.json();
      if (data.status) {
        return true;
      } else {
        console.error('Fonnte API Error:', data.reason || data.detail || data);
        return false;
      }
    } catch (error) {
      console.error('Failed to send WhatsApp:', error);
      return false;
    }
  }

  /**
   * Mengirim notifikasi Email (Mock)
   */
  static async sendEmail(email: string, subject: string, htmlMessage: string): Promise<boolean> {
    try {
      console.log('====================================');
      console.log(`[MOCK EMAIL] Mengirim ke: ${email}`);
      console.log(`Subjek: ${subject}`);
      console.log(`Pesan HTML:\n${htmlMessage}`);
      console.log('====================================');
      
      // TODO: Integrasi Nodemailer / Resend
      
      return true;
    } catch (error) {
      console.error('Failed to send Email:', error);
      return false;
    }
  }
}
