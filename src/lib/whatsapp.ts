export const sendWhatsAppMessage = async (target: string, message: string) => {
  try {
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      console.warn('FONNTE_TOKEN is not set. WhatsApp message not sent.');
      return false;
    }

    const formData = new FormData();
    formData.append('target', target);
    formData.append('message', message);
    formData.append('countryCode', '62');

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
      },
      body: formData,
    });

    const data = await response.json();
    if (data.status) {
      console.log(`WhatsApp message sent to ${target}`);
      return true;
    } else {
      console.error('Fonnte API Error:', data.reason || data.detail || data);
      return false;
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
};
