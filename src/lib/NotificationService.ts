export class NotificationService {
  /**
   * Mengirim notifikasi WhatsApp.
   * Saat ini masih berupa Mock/Simulasi. Siap diganti dengan Wablas/Fonnte API.
   */
  static async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    try {
      // Membersihkan nomor telepon (ubah 0 jadi 62 jika perlu)
      let targetPhone = phone;
      if (targetPhone.startsWith('0')) {
        targetPhone = '62' + targetPhone.substring(1);
      }

      console.log('====================================');
      console.log(`[MOCK WHATSAPP] Mengirim ke: ${targetPhone}`);
      console.log(`Pesan:\n${message}`);
      console.log('====================================');

      // TODO: Integrasi Wablas / Fonnte
      // const response = await fetch('https://api.fonnte.com/send', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': process.env.FONNTE_TOKEN || '',
      //   },
      //   body: new URLSearchParams({
      //     target: targetPhone,
      //     message: message
      //   })
      // });
      // return response.ok;

      return true;
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
