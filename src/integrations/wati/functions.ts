import axios from 'axios';
import FormData from 'form-data';


interface WhatsAppButton {
  title: string;
}

export async function sendInteractiveButtonsMessage(
  phoneNumber: string,
  headerText: string,
  bodyText: string,
  buttons: WhatsAppButton[],
  apiKey: string
): Promise<void> {
  const url = `https://live-mt-server.wati.io/8076/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${phoneNumber}`;
  const payload = {
    header: {
      type: "Text",
      text: headerText
    },
    body: bodyText,
    // footer: "Optional footer text", // Uncomment if you want a footer
    buttons: buttons.map(btn => ({ text: btn.title }))
  };

  console.log('Payload:', payload);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Interactive button sent successfully:', response.data);
  } catch (error: any) {
    console.error('Error sending interactive button:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status Code:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}


export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  apiKey: string
): Promise<void> {
  const url = `https://live-mt-server.wati.io/8076/api/v1/sendSessionMessage/${phoneNumber}`;
  const formData = new FormData();
  formData.append('messageText', message);

  try {
    await axios.post(url, formData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    console.log('Message sent successfully');
  } catch (error: any) {
    console.error('Error sending message:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status Code:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}