
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
 * Send interactive buttons message via WhatsApp
 * @param {string} headerText - Header text for the message
 * @param {string} bodyText - Body text for the message
 * @param {string} buttonText - Text for the button
 * @param {string} phoneNumber - The recipient's phone number
 * @param {string} accessToken - The API key
 * @returns {Promise<Object>} - Response from the API
 */
export const sendInteractiveButtonsMessage = async (headerText, bodyText, buttonText, phoneNumber, accessToken) => {
  try {
    // Format phone number
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanedPhone.length === 10 ? '91' + cleanedPhone : cleanedPhone;
    
    const response = await axios({
      method: 'POST',
      url: 'https://backend.aisensy.com/direct-apis/t1/messages',
      headers: {
        'Authorization': accessToken,
        'Content-Type': 'application/json',
      },
      data: {
        to: formattedPhone,
        type: "interactive",
        recipient_type: "individual",
        interactive: {
          type: "button",
          header: {
            type: "text",
            text: headerText
          },
          body: {
            text: bodyText
          },
          footer: {
            text: "Powered by MicroLearn"
          },
          action: {
            buttons: [
              {
                type: "reply",
                reply: {
                  id: "lets-microlearn",
                  title: buttonText
                }
              }
            ]
          }
        }
      }
    });
    
    return response.data;
  } catch (error) {
    console.error("Error sending interactive buttons message:", error);
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
    // Get learner data
    const { data: learnerData, error: learnerError } = await supabase
      .from('learners')
      .select('*')
      .eq('id', learnerId)
      .single();
      
    if (learnerError) throw learnerError;
    
    // Get WhatsApp config
    const whatsappConfig = await getWhatsAppConfig();
    if (!whatsappConfig || !whatsappConfig.serri_api_key) {
      throw new Error("WhatsApp is not configured");
    }
    
    const welcomeMessage = `Hello ${learnerData.name}! Welcome to MicroLearn. You have been successfully registered for MicroLearn training.`;
    
    // Send message
    const result = await sendWhatsAppMessage(
      learnerData.phone, 
      welcomeMessage, 
      whatsappConfig.serri_api_key
    );
    
    // Log message in database
    await supabase
      .from('messages')
      .insert([{ 
        learner_id: learnerId,
        course_id: null,
        course_day_id: null,
        type: 'whatsapp',
        status: 'sent'
      }]);
      
    return result;
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
    // Get learner data
    const { data: learnerData, error: learnerError } = await supabase
      .from('learners')
      .select('*')
      .eq('id', learnerId)
      .single();
      
    if (learnerError) throw learnerError;
    
    // Get course data
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();
      
    if (courseError) throw courseError;
    
    // Get WhatsApp config
    const whatsappConfig = await getWhatsAppConfig();
    if (!whatsappConfig || !whatsappConfig.serri_api_key) {
      throw new Error("WhatsApp is not configured");
    }
    
    // Format date for display
    const formattedDate = new Date(startDate).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    
    const headerText = "Course Assignment Notification";
    const bodyText = `Hi ${learnerData.name}! The course "${courseData.name}" has been assigned to you, starting on ${formattedDate}.`;
    const buttonText = "Let's MicroLearn";
    
    // Send interactive message
    const result = await sendInteractiveButtonsMessage(
      headerText,
      bodyText,
      buttonText,
      learnerData.phone,
      whatsappConfig.serri_api_key
    );
    
    // Log message in database
    await supabase
      .from('messages')
      .insert([{ 
        learner_id: learnerId,
        course_id: courseId,
        course_day_id: null,
        type: 'whatsapp',
        status: 'sent'
      }]);
      
    return result;
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
    // Get WhatsApp config
    const whatsappConfig = await getWhatsAppConfig();
    if (!whatsappConfig || !whatsappConfig.serri_api_key) {
      throw new Error("WhatsApp is not configured");
    }
    
    const message = "This is a test message from MicroLearn. If you received this, your WhatsApp integration is working correctly.";
    
    // Send message
    return await sendWhatsAppMessage(
      phoneNumber, 
      message, 
      whatsappConfig.serri_api_key
    );
  } catch (error) {
    console.error("Error sending test message:", error);
    throw error;
  }
};
