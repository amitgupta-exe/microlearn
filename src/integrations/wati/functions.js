
/**
 * Functions for interacting with the AiSensy API
 */

import { supabase } from "@/integrations/supabase/client";
import axios from 'axios';

/**
 * Sends a message via AiSensy WhatsApp API
 * @param {string} phoneNumber - The recipient's phone number
 * @param {string} message - The message to send
 * @param {string} accessToken - The AiSensy API key
 * @returns {Promise<Object>} - Response from the API
 */
export const sendWhatsAppMessage = async (phoneNumber, message, accessToken) => {
  try {
    // Format phone number (remove any non-numeric characters)
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming India +91 as default)
    const formattedPhone = cleanedPhone.length === 10 ? '91' + cleanedPhone : cleanedPhone;
    
    // Send message directly using the AiSensy API
    const response = await axios({
      method: 'post',
      url: 'https://backend.aisensy.com/direct-apis/t1/messages',
      headers: {
        'Authorization': accessToken,
        'Content-Type': 'application/json'
      },
      data: {
        to: formattedPhone,
        type: "text",
        recipient_type: "individual",
        text: {
          body: message
        }
      }
    });
    
    return response.data;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
};

/**
 * Gets the WhatsApp configuration for the current user
 * @returns {Promise<Object|null>} - The WhatsApp configuration
 */
export const getWhatsAppConfig = async () => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error("User not authenticated");
    }
    
    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', userData.user.id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching WhatsApp config:", error);
    return null;
  }
};

/**
 * Sends a welcome message to a learner
 * @param {string} learnerId - The learner's ID
 * @returns {Promise<Object>} - Response from the API
 */
export const sendWelcomeMessage = async (learnerId) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-course-notification', {
      body: { 
        learner_id: learnerId,
        type: 'welcome'
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error sending welcome message:", error);
    throw error;
  }
};

/**
 * Sends a course assignment notification to a learner
 * @param {string} learnerId - The learner's ID
 * @param {string} courseId - The course ID
 * @param {string} startDate - The course start date
 * @returns {Promise<Object>} - Response from the API
 */
export const sendCourseAssignmentMessage = async (learnerId, courseId, startDate) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-course-notification', {
      body: { 
        learner_id: learnerId,
        course_id: courseId,
        start_date: startDate,
        type: 'course_assigned'
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error sending course assignment message:", error);
    throw error;
  }
};

/**
 * Sends a test message to verify WhatsApp integration
 * @param {string} phoneNumber - The phone number to test
 * @returns {Promise<Object>} - Response from the API
 */
export const sendTestMessage = async (phoneNumber) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-course-notification', {
      body: { 
        learner_phone: phoneNumber,
        type: 'test'
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error sending test message:", error);
    throw error;
  }
};
