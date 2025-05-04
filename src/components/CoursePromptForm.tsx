
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const formSchema = z.object({
  title: z.string().min(5, {
    message: "Title must be at least 5 characters.",
  }).max(100, {
    message: "Title must not exceed 100 characters."
  }),
  prompt: z.string().min(20, {
    message: "Prompt must be at least 20 characters long.",
  }).max(2000, {
    message: "Prompt must not exceed 2000 characters."
  }),
  days: z.number().int().min(1).max(10),
});

interface CoursePromptFormProps {
  onSuccess?: (courseId: string) => void;
  onCancel: () => void;
}

const CoursePromptForm: React.FC<CoursePromptFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      prompt: '',
      days: 4,
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      
      const { title, prompt, days } = values;

      // System prompt for course generation
      const systemPrompt = `You are an expert curriculum designer who creates structured course content. 
      Generate a ${days}-day course about "${prompt}" with each day having educational content.
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

      // Call Azure OpenAI API directly here
      try {
        const endpoint = "https://make002.openai.azure.com/";
        const apiVersion = "2024-12-01-preview";
        const deploymentName = "o4-mini";
        
        // Get API key from environment
        const { data: secretData, error: secretError } = await supabase
          .from('whatsapp_config')
          .select('*')
          .eq('user_id', user?.id)
          .single();
          
        if (secretError) {
          console.error('Error fetching API key:', secretError);
          toast.error('Failed to fetch Azure OpenAI API key. Please check your configuration.');
          return;
        }
        
        // Use the API key for Azure OpenAI
        const apiKey = secretData?.serri_api_key;
        if (!apiKey) {
          toast.error('No API key found. Please configure your WhatsApp settings first.');
          return;
        }
        
        // Make the API call
        const openAIResponse = await axios.post(
          `${endpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`,
          {
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
          },
          {
            headers: {
              "Content-Type": "application/json",
              "api-key": apiKey,
            },
          }
        );

        console.log("Azure OpenAI API response received:", openAIResponse.status);
        
        let courseContent;
        try {
          // Extract the JSON from the response
          const contentText = openAIResponse.data.choices[0].message.content;
          // Find JSON object in the response (handling possible markdown code blocks)
          const jsonMatch = contentText.match(/```json\s*([\s\S]*?)\s*```/) || contentText.match(/```\s*([\s\S]*?)\s*```/) || [null, contentText];
          const jsonString = jsonMatch[1] || contentText;
          courseContent = JSON.parse(jsonString.trim());
          
          if (!courseContent || !courseContent.days || !Array.isArray(courseContent.days)) {
            throw new Error("Invalid course structure");
          }
        } catch (error) {
          console.error("Error parsing OpenAI response:", error);
          toast.error('Failed to parse generated course data');
          return;
        }

        // Save Alfred course data
        const alfredCourseData = courseContent.days.map(day => ({
          course_name: courseContent.course_name || title,
          day: day.day_number,
          module_1_text: day.module_1_text || day.content,
          module_2_text: day.module_2_text || null,
          module_3_text: day.module_3_text || null
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('alfred_course_data')
          .insert(alfredCourseData)
          .select();

        if (insertError) {
          console.error('Error saving course data:', insertError);
          toast.error('Failed to save generated course data');
          return;
        }

        // Create a regular course entry
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .insert({
            name: courseContent.course_name || title,
            description: `AI-generated course about: ${prompt}`,
            category: "Generated Course",
            language: "English",
            status: "active",
            created_by: user?.id,
            visibility: "private"
          })
          .select()
          .single();

        if (courseError) {
          console.error("Error creating course:", courseError);
          toast.error('Failed to create course');
          return;
        }

        // Create course days
        const courseDays = courseContent.days.map(day => ({
          course_id: courseData.id,
          day_number: day.day_number,
          title: day.title || `Day ${day.day_number}`,
          info: day.content || day.module_1_text,
          module_1: day.module_1_text || null,
          module_2: day.module_2_text || null,
          module_3: day.module_3_text || null
        }));

        const { error: daysError } = await supabase
          .from('course_days')
          .insert(courseDays);

        if (daysError) {
          console.error("Error creating course days:", daysError);
          toast.error('Failed to create course days');
          return;
        }

        console.log("Course generated successfully:", courseData);
        toast.success("Course generated successfully!");
        
        // Call onSuccess if provided
        if (onSuccess && courseData?.id) {
          onSuccess(courseData.id);
        }
      } catch (apiError: any) {
        console.error("Error calling Azure OpenAI API:", apiError);
        toast.error(apiError.message || "An error occurred while communicating with Azure OpenAI");
      }
    } catch (error: any) {
      console.error("Error in course generation:", error);
      toast.error(error.message || "An error occurred while generating course");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Course from Prompt</CardTitle>
        <CardDescription>
          Use AI to generate a MicroLearn course from your prompt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter a title for your course" 
                      className="glass-input"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Prompt</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what you want in your course. Be specific about topics, structure, and style." 
                      className="min-h-[150px] glass-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Days</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min={1}
                      max={10}
                      className="glass-input w-24"
                      {...field}
                      onChange={event => field.onChange(parseInt(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Course'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CoursePromptForm;
