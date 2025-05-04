
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequestBody {
  learner_id?: string;
  learner_name?: string;
  learner_phone?: string;
  course_name?: string;
  course_id?: string;
  start_date?: string;
  type?: 'welcome' | 'course_assigned' | 'course_day' | 'test';
  course_day_info?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const requestData: NotificationRequestBody = await req.json();
    console.log("Notification request received:", JSON.stringify(requestData));

    const { 
      learner_id, 
      learner_name, 
      learner_phone, 
      course_name, 
      course_id,
      start_date,
      type = 'course_assigned',
      course_day_info
    } = requestData;

    // Get phone number if not provided but learner_id is
    let phoneNumber = learner_phone;
    let name = learner_name;
    
    if (!phoneNumber && learner_id) {
      // Fetch learner phone from database if not provided
      const { data: learnerData, error: learnerError } = await supabaseClient
        .from('learners')
        .select('phone, name')
        .eq('id', learner_id)
        .single();

      if (learnerError) {
        console.error("Error fetching learner data:", learnerError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to fetch learner data" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!learnerData?.phone) {
        return new Response(
          JSON.stringify({ success: false, error: "Learner phone number not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      phoneNumber = learnerData.phone;
      name = learnerData.name;
    }

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone number is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch WhatsApp configuration
    const { data: whatsappConfig, error: configError } = await supabaseClient
      .from('whatsapp_config')
      .select('*')
      .eq('is_configured', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError || !whatsappConfig) {
      console.error("WhatsApp configuration error:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Format phone number (remove any non-numeric characters and add country code if needed)
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Construct the message based on the notification type
    let messageText = "";
    let messageType = "text";
    let messageBody = {};
    
    if (type === 'welcome') {
      messageText = `Hello ${name || "there"}! You have been successfully registered for MicroLearn training.`;
      messageBody = {
        to: formattedPhone,
        type: "text",
        recipient_type: "individual",
        text: {
          body: messageText
        }
      };
    } else if (type === 'course_assigned') {
      // Use interactive button message for course assignment
      messageBody = {
        to: formattedPhone,
        type: "interactive",
        recipient_type: "individual",
        interactive: {
          type: "button",
          header: {
            type: "text",
            text: "Course Assignment Notification"
          },
          body: {
            text: `Hi ${name || "there"}! The course "${course_name}" has been assigned to you, starting on ${formatDate(start_date || new Date().toISOString())}.`
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
                  title: "Let's MicroLearn"
                }
              }
            ]
          }
        }
      };
      messageType = "interactive";
    } else if (type === 'course_day') {
      messageText = `Hello ${name || "there"}! Here is your content for today's lesson in "${course_name}":\n\n${course_day_info || "No content available"}`;
      messageBody = {
        to: formattedPhone,
        type: "text",
        recipient_type: "individual",
        text: {
          body: messageText
        }
      };
    } else if (type === 'test') {
      messageText = `This is a test message from MicroLearn. If you received this, your WhatsApp integration is working correctly.`;
      messageBody = {
        to: formattedPhone,
        type: "text",
        recipient_type: "individual",
        text: {
          body: messageText
        }
      };
    }

    // Send WhatsApp message using the AiSensy API
    const apiResponse = await sendAiSensyMessage(
      whatsappConfig.serri_api_key, // Use serri_api_key as the access token
      messageBody,
      messageType
    );

    console.log("AiSensy API response:", apiResponse);

    // Log the message in the database if learner_id and course_id are provided
    if (learner_id && type !== 'welcome' && type !== 'test') {
      try {
        const { error: messageError } = await supabaseClient
          .from('messages')
          .insert([{ 
            learner_id,
            course_id: course_id || null,
            course_day_id: type === 'course_day' ? course_id : null, // Using course_id as course_day_id for simplicity
            type: 'whatsapp',
            status: 'sent'
          }]);

        if (messageError) {
          console.error("Error logging message:", messageError);
        }
      } catch (error) {
        console.error("Error inserting message record:", error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent successfully",
        details: apiResponse
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing notification request:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Format phone number to international format
function formatPhoneNumber(phone: string): string {
  // Remove any non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if the number already has a country code (starts with + or has enough digits)
  if (cleaned.startsWith('1') && cleaned.length >= 10) {
    return cleaned;
  } else if (cleaned.length === 10) {
    // Assume Indian number and add country code
    return '91' + cleaned;
  }
  
  // Return as is if already formatted or can't determine format
  return cleaned;
}

// Format date to a human-readable format
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  } catch (e) {
    return isoDate;
  }
}

// Send WhatsApp message using AiSensy API
async function sendAiSensyMessage(
  accessToken: string,
  messageBody: any,
  messageType: string = "text"
): Promise<any> {
  try {
    // For demo or test mode, just log and return success
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      console.log(`[TEST MODE] Would send message: ${JSON.stringify(messageBody)}`);
      return { status: "success", mode: "test" };
    }
    
    // Send message using AiSensy API
    const response = await fetch(
      'https://backend.aisensy.com/direct-apis/t1/messages',
      {
        method: 'POST',
        headers: {
          'Authorization': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AiSensy API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending AiSensy message:", error);
    throw error;
  }
}
