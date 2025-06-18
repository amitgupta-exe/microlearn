
import axios from 'axios';
import FormData from 'form-data';

interface WhatsAppButton {
  title: string;
}

interface WhatsAppListRow {
  title: string;
  description?: string;
}

const WATI_API_BASE = process.env.WATI_URL || 'https://live-mt-server.wati.io/8076';
const WATI_API_KEY = process.env.WATI_API_KEY || '';

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

export async function sendCourseAssignmentNotification(
  learnerName: string,
  courseName: string,
  phoneNumber: string
): Promise<void> {
  console.log('🔔 Sending course assignment notification via WATI');
  
  const headerText = "Course Assignment Notification";
  const bodyText = `Hi ${learnerName}! The course "${courseName}" has been assigned to you. Click below to start learning!`;
  const buttons = [{ title: "Let's MicroLearn" }];

  await sendInteractiveButtonsMessage(phoneNumber, headerText, bodyText, buttons);
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
