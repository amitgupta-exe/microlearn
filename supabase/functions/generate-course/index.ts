
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoursePromptRequest {
  promptText: string;
  templateVariables?: {
    topic?: string;
    language?: string;
    style?: string;
    [key: string]: string | undefined;
  };
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
    
    // LLama API endpoint
    const LLAMA_API_ENDPOINT = "https://api.llama-api.com"; // Replace with actual endpoint when available

    const { promptText, templateVariables } = await req.json() as CoursePromptRequest;
    
    if (!promptText) {
      return new Response(
        JSON.stringify({ error: "Prompt text is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Process template variables if they exist
    let processedPrompt = promptText;
    if (templateVariables) {
      Object.entries(templateVariables).forEach(([key, value]) => {
        if (value) {
          const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
          processedPrompt = processedPrompt.replace(placeholder, value);
        }
      });
    }

    // For demonstration/development purposes, generate mock course content
    // In production, replace this with actual API call to LLama
    let courseContent;
    
    try {
      // Mock response for now - in production, replace with actual LLama API call
      // Example:
      // const llmResponse = await fetch(LLAMA_API_ENDPOINT, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ prompt: processedPrompt })
      // });
      // courseContent = await llmResponse.json();
      
      // Generate mock structured content
      courseContent = {
        day1: {
          module1: {
            content: "👋 Welcome to Day 1! In this first module, we'll explore the foundational concepts of our topic. Understanding the basics is crucial for building expertise. We'll start with key definitions and context to ensure everyone has a solid grounding. This approach helps establish a common language and framework for the more advanced concepts to come. By the end of this module, you'll be able to explain the core principles to others. Let's take a moment to reflect: What aspects of this topic are you most curious about?\n"
          },
          module2: {
            content: "🔍 Now that we've covered the basics, let's dig deeper into the practical applications. This module bridges theory with real-world implementation, showing how these concepts manifest in everyday scenarios. We'll examine case studies that demonstrate successful approaches and common pitfalls to avoid. Understanding these examples will help you recognize patterns and make better decisions in your own context. The principles we discuss here will serve as building blocks for more complex scenarios. Consider this question: How might you apply these concepts in your current situation?\n"
          },
          module3: {
            content: "🌟 Let's wrap up our first day by connecting the dots between theory and practice. In this module, we'll synthesize what we've learned and establish a framework for moving forward. The integration of concepts is where true mastery begins to develop. We'll discuss how to evaluate your own progress and recognize when you're ready to advance to more complex ideas. This self-assessment is a crucial skill for continuous learning. The journey of a thousand miles begins with a single step, and you've already taken several! Take a moment to write down three key insights from today's learning.\n"
          }
        },
        day2: {
          module1: {
            content: "🚀 Welcome to Day 2! Today we'll build upon yesterday's foundation and explore intermediate concepts. The learning curve may steepen slightly, but your understanding from Day 1 will support this next level of complexity. We'll introduce new terminology and frameworks that expand your conceptual toolkit. These ideas represent the evolution of basic principles into more nuanced understanding. Many learners find this transition particularly exciting as the bigger picture starts to emerge. Question: What connections do you see between today's material and what we covered yesterday?\n"
          },
          module2: {
            content: "📊 In this module, we'll focus on analytical approaches to our topic. Data and measurement provide objective ways to evaluate progress and outcomes. We'll discuss key metrics and indicators that professionals use to guide decision-making. Understanding how to gather and interpret relevant information empowers you to make evidence-based choices rather than relying on intuition alone. This quantitative foundation complements the conceptual understanding we've been developing. Your task: Identify one aspect of your work or interest that could benefit from more systematic measurement.\n"
          },
          module3: {
            content: "🧩 As we conclude Day 2, let's tackle some common challenges and their solutions. Every field has its obstacles, and anticipating them helps you navigate more effectively. We'll discuss troubleshooting strategies and resources that can support you when difficulties arise. Developing resilience and problem-solving skills is as important as mastering content knowledge. The ability to overcome setbacks often distinguishes successful practitioners from the rest. Reflection question: What potential challenges do you anticipate in applying what you've learned, and how might you address them?\n"
          }
        },
        day3: {
          module1: {
            content: "🌈 Welcome to our final day! Today we'll focus on advanced applications and future trends. The landscape is constantly evolving, and staying aware of emerging developments keeps your knowledge relevant. We'll explore cutting-edge approaches that are shaping the future of this field. Understanding these trends helps you anticipate changes rather than merely reacting to them. This forward-looking perspective is valuable in any professional context. Consider this: How do you plan to stay updated on developments in this area after completing this course?\n"
          },
          module2: {
            content: "🤝 In this module, we'll discuss collaboration and community resources. No one works in isolation, and knowing how to leverage collective wisdom accelerates your growth. We'll identify key communities, forums, and collaborative opportunities in this field. Engaging with others facing similar challenges provides both practical support and motivation. These connections often lead to unexpected opportunities for learning and advancement. Your action item: Research one community or resource you could join to continue your learning journey.\n"
          },
          module3: {
            content: "🎯 As we conclude our course, let's create your personal action plan. The true value of learning emerges when knowledge transforms into practice. We'll outline a framework for continued growth and application of the concepts we've covered. Setting specific, achievable goals increases the likelihood that you'll implement what you've learned. Remember that mastery comes through consistent practice over time. Final reflection exercise: Write down three specific actions you'll take in the next week to apply what you've learned, and one longer-term goal for the next month.\n"
          }
        }
      };
      
      console.log("Generated course content (mock):", JSON.stringify(courseContent).substring(0, 200) + "...");
      
      return new Response(
        JSON.stringify({
          success: true,
          course: courseContent
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      
    } catch (llmError) {
      console.error("Error generating course content:", llmError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate course content", 
          details: llmError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
  } catch (error) {
    console.error("Error in generate-course function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
