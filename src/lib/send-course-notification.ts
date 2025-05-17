
// This file is to handle the send-course-notification functionality
// Import the necessary modules and implement the required functionality
// for sending course notifications via WhatsApp using the functions
// from whatsapp-notifications.ts

import { sendCourseAssignmentNotification } from './whatsapp-notifications';

export const sendCourseNotification = async (learnerName: string, courseName: string, phone: string) => {
  try {
    await sendCourseAssignmentNotification(learnerName, courseName, phone);
    return { success: true };
  } catch (error) {
    console.error('Error sending course notification:', error);
    return { success: false, error };
  }
};
