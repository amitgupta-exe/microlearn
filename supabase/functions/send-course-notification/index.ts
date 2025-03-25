
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationData {
  learner_id: string;
  learner_name: string;
  learner_phone: string;
  course_name: string;
  start_date: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const notificationData: NotificationData = await req.json();
    const { learner_name, learner_phone, course_name, start_date } = notificationData;

    // Validate data
    if (!learner_phone || !course_name) {
      throw new Error("Missing required fields");
    }

    // Normalize phone number (ensure it has the international format for WhatsApp)
    const normalizedPhone = formatPhoneNumber(learner_phone);

    // Log for debugging
    console.log(`Sending WhatsApp notification to ${normalizedPhone} for course ${course_name}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Get WhatsApp configuration from database
    const { data: whatsappConfig, error: configError } = await supabaseClient
      .from("whatsapp_config")
      .select("*")
      .limit(1)
      .single();

    if (configError || !whatsappConfig) {
      console.error("Failed to retrieve WhatsApp configuration:", configError);
      throw new Error("WhatsApp is not configured");
    }

    // Check if WhatsApp is configured and enabled
    if (!whatsappConfig.is_configured) {
      console.log("WhatsApp is not configured yet, skipping notification");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "WhatsApp is not configured" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Prepare message text
    const messageText = `Hello ${learner_name}! You have been assigned a new course: "${course_name}" starting on ${start_date}. Please check your learning portal for more details.`;

    if (whatsappConfig.api_key) {
      // Call WhatsApp Business API
      const whatsappResponse = await sendWhatsAppMessage(
        whatsappConfig,
        normalizedPhone,
        messageText
      );

      // Log notification in messages table
      await supabaseClient.from("messages").insert([
        {
          learner_id: notificationData.learner_id,
          course_id: null, // We don't have course_id in the notification payload
          course_day_id: null,
          type: "whatsapp",
          status: "sent",
        },
      ]);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "WhatsApp notification sent",
          whatsappResponse
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // For testing/development when API key is not set
      console.log("WhatsApp notification would be sent with message:", messageText);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "WhatsApp notification simulated (testing mode)",
          testMessage: messageText
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper function to format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");
  
  // Ensure it has a country code (add 91 for India if not present)
  if (digits.length === 10) {
    digits = "91" + digits; // Add India country code
  } else if (digits.length > 10 && !digits.startsWith("91")) {
    // If it has more than 10 digits but doesn't start with 91,
    // assume it has some country code and leave it as is
  }
  
  return digits;
}

// Function to send WhatsApp message using the Meta WhatsApp Business API
async function sendWhatsAppMessage(
  whatsappConfig: any,
  phone: string,
  message: string
) {
  try {
    const url = `https://graph.facebook.com/v16.0/${whatsappConfig.phone_number_id}/messages`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${whatsappConfig.api_key}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: {
          preview_url: false,
          body: message
        }
      })
    });
    
    const data = await response.json();
    console.log("WhatsApp API response:", data);
    return data;
  } catch (error) {
    console.error("Error calling WhatsApp API:", error);
    throw error;
  }
}
