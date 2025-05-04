
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CourseGenerationRequest {
  prompt: string;
  courseName?: string;
  numDays?: number;
  userId?: string;
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

    // Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') as string;
    const azureApiKey = Deno.env.get('AZURE_OPENAI_KEY') as string;
    const apiVersion = "2024-12-01-preview";
    const deploymentName = "o4-mini";

    if (!azureEndpoint || !azureApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Azure OpenAI configuration is missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Get request body
    const { prompt, courseName = "Generated Course", numDays = 4, userId } = await req.json() as CourseGenerationRequest;

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "Course prompt is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Generating course: "${courseName}" with prompt: "${prompt}"`);

    // Build the system prompt for course generation
    const systemPrompt = `You are an expert curriculum designer who creates structured course content. 
    Generate a ${numDays}-day course about "${prompt}" with each day having educational content.
    Format your response as a valid JSON object with the following structure:
    {
      "course_name": "Title of the course",
      "days": [
        {
          "day_number": 1,
          "title": "Day 1: Introduction to the Topic",
          "content": "Main content text for day 1...",
          "module_1_text": "Text for module 1...",
          "module_2_text": "Text for module 2...",
          "module_3_text": "Text for module 3..."
        },
        ... more days
      ]
    }
    Each day should have educational content split into 1-3 modules.
    Keep each module to 200-300 words maximum. Include practical examples, tips, and exercises.`;

    // Call Azure OpenAI API
    const openAIUrl = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    console.log(`Calling Azure OpenAI API at: ${openAIUrl}`);
    
    const openAIResponse = await fetch(openAIUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": azureApiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("Azure OpenAI API error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Azure OpenAI API error: ${errorText}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const openAIData = await openAIResponse.json();
    console.log("Azure OpenAI API response:", JSON.stringify(openAIData).substring(0, 200) + "...");
    
    let courseContent;
    try {
      // Extract the JSON from the response
      const contentText = openAIData.choices[0].message.content;
      // Find JSON object in the response (handling possible markdown code blocks)
      const jsonMatch = contentText.match(/```json\s*([\s\S]*?)\s*```/) || contentText.match(/```\s*([\s\S]*?)\s*```/) || [null, contentText];
      const jsonString = jsonMatch[1] || contentText;
      courseContent = JSON.parse(jsonString.trim());
      
      if (!courseContent || !courseContent.days || !Array.isArray(courseContent.days)) {
        throw new Error("Invalid course structure");
      }
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse generated course data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Now save the course content to the database
    try {
      // First, insert the course into alfred_course_data
      const alfredCourseData = courseContent.days.map(day => ({
        course_name: courseContent.course_name || courseName,
        day: day.day_number,
        module_1_text: day.module_1_text || day.content,
        module_2_text: day.module_2_text || null,
        module_3_text: day.module_3_text || null
      }));

      const { data: insertedData, error: insertError } = await supabaseClient
        .from('alfred_course_data')
        .insert(alfredCourseData)
        .select();

      if (insertError) {
        throw insertError;
      }

      // Then, create a new course entry (only if userId is provided)
      let courseId = null;
      if (userId) {
        const { data: courseData, error: courseError } = await supabaseClient
          .from('courses')
          .insert({
            name: courseContent.course_name || courseName,
            description: `AI-generated course about: ${prompt}`,
            category: "Generated Course",
            language: "English",
            status: "active",
            created_by: userId,
            visibility: "private"
          })
          .select()
          .single();

        if (courseError) {
          console.error("Error creating course:", courseError);
        } else {
          courseId = courseData.id;

          // Create course days
          const courseDays = courseContent.days.map(day => ({
            course_id: courseId,
            day_number: day.day_number,
            title: day.title || `Day ${day.day_number}`,
            info: day.content || day.module_1_text,
            module_1: day.module_1_text || null,
            module_2: day.module_2_text || null,
            module_3: day.module_3_text || null
          }));

          const { error: daysError } = await supabaseClient
            .from('course_days')
            .insert(courseDays);

          if (daysError) {
            console.error("Error creating course days:", daysError);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          course: {
            id: courseId,
            name: courseContent.course_name || courseName,
            days: courseContent.days.length
          },
          message: "Course generated successfully"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error saving course data:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save generated course" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in course generation:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
