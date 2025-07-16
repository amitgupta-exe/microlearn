
import axios from 'axios';
import FormData from 'form-data';

interface WhatsAppButton {
  title: string;
}

interface WhatsAppListRow {
  title: string;
  description?: string;
}

const WATI_API_BASE = import.meta.env.VITE_WATI_URL || 'https://live-mt-server.wati.io/8076';
const WATI_API_KEY = import.meta.env.VITE_WATI_API_KEY || '';

export async function sendInteractiveButtonsMessage(
  phoneNumber: string,
  headerText: string,
  bodyText: string,
  buttons: WhatsAppButton[],
  apiKey: string = WATI_API_KEY
): Promise<void> {
  const url = `${WATI_API_BASE}/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${phoneNumber}`;
  const payload = {
    header: {
      type: "Text",
      text: headerText
    },
    body: bodyText,
    buttons: buttons.map(btn => ({ text: btn.title }))
  };

  console.log('Sending interactive button message:', payload);

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
  apiKey: string = WATI_API_KEY
): Promise<void> {
  const url = `${WATI_API_BASE}/api/v1/sendSessionMessage/${phoneNumber}`;
  const formData = new FormData();
  formData.append('messageText', message);

  console.log('Sending WhatsApp message to:', phoneNumber, 'Message:', message);

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

export async function sendListInteractiveMessage(
  phoneNumber: string,
  body: string,
  buttonText: string,
  rows: WhatsAppListRow[],
  apiKey: string = WATI_API_KEY
): Promise<void> {
  const url = `${WATI_API_BASE}/api/v1/sendInteractiveListMessage?whatsappNumber=${phoneNumber}`;
  const payload = {
    header: "",
    body: body,
    footer: "",
    buttonText: buttonText,
    sections: [
      {
        title: "Options",
        rows: rows
      }
    ]
  };

  console.log('Sending list interactive message:', payload);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('List interactive message sent successfully:', response.data);
  } catch (error: any) {
    console.error('Error sending list interactive message:', error.response ? error.response.data : error.message);
  }
}


export async function sendCourseSuspensionNotification(
  learnerName: string,
  courseName: string,
  phoneNumber: string
): Promise<void> {
  console.log('🔔 Sending course suspension notification via WATI');

  const message = `Hello ${learnerName}! Your previous course "${courseName}" has been suspended as you have been assigned a new course.`;

  await sendWhatsAppMessage(phoneNumber, message);
}

export async function sendWelcomeMessage(
  learnerName: string,
  phoneNumber: string
): Promise<void> {
  console.log('🔔 Sending welcome message via WATI');

  const message = `Hello ${learnerName}! You have been successfully registered for MicroLearn training.`;

  await sendWhatsAppMessage(phoneNumber, message);
}

export async function sendTemplateMessage(
  phoneNumber: string,
  templateName: string,
  templateParameters: { name: string; value: string }[] = [],
  apiKey: string = WATI_API_KEY
): Promise<void> {
  // Updated URL to include tenantId from your WATI_API_BASE
  const url = `${WATI_API_BASE}/api/v1/sendTemplateMessage?whatsappNumber=${phoneNumber}`;
  
  const payload = {
    template_name: templateName,
    broadcast_name: templateName,
    parameters: templateParameters,
  };

  console.log('Sending template message:', payload);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Template message sent successfully:', response.data);
  } catch (error: any) {
    console.error('Error sending template message:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status Code:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Response Data:', error.response.data);
    }
    throw error; // Re-throw to allow fallback handling
  }
}

export async function sendCourseAssignmentNotification(
  learnerName: string,
  courseName: string,
  phoneNumber: string
): Promise<void> {
  console.log('🔔 Sending course assignment notification via WATI');

  try {
    // Map your template variables to the correct parameter names
    const parameters = [
      { name: "name", value: learnerName },// Starting with Day 1
      { name: "course_name", value: courseName }
    ];

    await sendTemplateMessage(phoneNumber, "microlearnnotification", parameters);
    console.log('Template message sent successfully');
  } catch (error) {
    console.log('Template message failed, falling back to regular message');
    
    // Fallback to regular WhatsApp message if template fails
    const message = `Hey ${learnerName}! Welcome to Day 1 of ${courseName}. It's an exciting journey! Let's get started!`;
    await sendWhatsAppMessage(phoneNumber, message);
  }
}