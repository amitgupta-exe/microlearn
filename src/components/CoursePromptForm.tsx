
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  course_title: z.string().min(5, {
    message: "Title must be at least 5 characters.",
  }).max(100, {
    message: "Title must not exceed 100 characters."
  }),
  topic: z.string().min(3, {
    message: "Topic must be at least 3 characters long.",
  }).max(100, {
    message: "Topic must not exceed 100 characters."
  }),
  goal: z.string().min(10, {
    message: "Goal must be at least 10 characters long.",
  }).max(500, {
    message: "Goal must not exceed 500 characters."
  }),
  style: z.enum(["Professional", "Casual", "Informational"]), 
  language: z.enum(["English", "Hindi", "Marathi"]),
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
  const [previewData, setPreviewData] = useState<any>(null);
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      course_title: '',
      topic: '',
      goal: '',
      style: "Professional",
      language: "English",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      
      const { course_title, topic, goal, style, language } = values;

      // Save the course generation request
      const { data: requestData, error: requestError } = await supabase
        .from('course_generation_requests')
        .insert({
          course_title,
          topic,
          goal,
          style,
          language,
          created_by: user?.id
        })
        .select()
        .single();

      if (requestError) {
        console.error('Error saving course request:', requestError);
        toast.error('Failed to save course generation request');
        return;
      }

      // System prompt for course generation
      const systemPrompt = `You are an expert curriculum designer who creates structured course content. 
      Generate a 3-day course about "${topic}" with the goal of "${goal}". Use a ${style} communication style in ${language} language.
      Each day should have exactly 3 educational modules.
      Format your response as a valid JSON object with the following structure:
      {
        "Day1": {
          "Day 1 - Module 1": {
            "title": "Introduction to the Topic",
            "content": "Main content text for module 1..."
          },
          "Day 1 - Module 2": {
            "title": "Key Concepts",
            "content": "Main content text for module 2..."
          },
          "Day 1 - Module 3": {
            "title": "Practical Application",
            "content": "Main content text for module 3..."
          }
        },
        "Day2": {
          "Day 2 - Module 1": {
            "title": "Advanced Concepts",
            "content": "Main content text for module 1..."
          },
          "Day 2 - Module 2": {
            "title": "Case Studies",
            "content": "Main content text for module 2..."
          },
          "Day 2 - Module 3": {
            "title": "Exercises",
            "content": "Main content text for module 3..."
          }
        },
        "Day3": {
          "Day 3 - Module 1": {
            "title": "Recap and Review",
            "content": "Main content text for module 1..."
          },
          "Day 3 - Module 2": {
            "title": "Advanced Applications",
            "content": "Main content text for module 2..."
          },
          "Day 3 - Module 3": {
            "title": "Next Steps",
            "content": "Main content text for module 3..."
          }
        }
      }
      Keep each module to 200-300 words maximum. Include practical examples, tips, and exercises.
      Ensure the content is appropriate for the specified style and language.`;

      // Call Azure OpenAI API
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
                content: `Create a 3-day course about "${topic}" with goal "${goal}" in ${style} style using ${language} language.`
              }
            ],
            max_tokens: 3000,
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
        
        // Parse the course content
        let courseContent;
        try {
          // Extract the JSON from the response
          const contentText = openAIResponse.data.choices[0].message.content;
          
          // Find JSON object in the response (handling possible markdown code blocks)
          const jsonMatch = contentText.match(/```json\s*([\s\S]*?)\s*```/) || contentText.match(/```\s*([\s\S]*?)\s*```/) || [null, contentText];
          const jsonString = jsonMatch[1] || contentText;
          
          try {
            courseContent = JSON.parse(jsonString.trim());
            setPreviewData(courseContent);
          } catch (e) {
            console.error("Failed to parse extracted JSON from OpenAI:", e, jsonString);
            toast.error("Failed to parse course content");
            return;
          }
          
          if (!courseContent || !courseContent.Day1) {
            throw new Error("Invalid course structure");
          }
        } catch (error) {
          console.error("Error parsing OpenAI response:", error);
          toast.error('Failed to parse generated course data');
          return;
        }

        // Store course data in the database
        const insertPromises = [];
        
        for (let dayNum = 1; dayNum <= 3; dayNum++) {
          const dayKey = `Day${dayNum}`;
          const modules = courseContent[dayKey];
          
          if (modules) {
            const insertObj = {
              request_id: requestData.request_id,
              day: dayNum,
              module_1: modules[`Day ${dayNum} - Module 1`] ? modules[`Day ${dayNum} - Module 1`].content : null,
              module_2: modules[`Day ${dayNum} - Module 2`] ? modules[`Day ${dayNum} - Module 2`].content : null,
              module_3: modules[`Day ${dayNum} - Module 3`] ? modules[`Day ${dayNum} - Module 3`].content : null,
              topic_name: topic
            };
            
            insertPromises.push(
              supabase.from('website_cop_courses').insert(insertObj)
            );
          }
        }
        
        // Wait for all inserts to complete
        await Promise.all(insertPromises);
        
        // Create a regular course entry
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .insert({
            name: course_title,
            description: `Generated course about: ${topic} with goal: ${goal}`,
            category: "Generated Course",
            language: language,
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
        const courseDays = [];
        
        for (let dayNum = 1; dayNum <= 3; dayNum++) {
          const dayKey = `Day${dayNum}`;
          const modules = courseContent[dayKey];
          
          if (modules) {
            courseDays.push({
              course_id: courseData.id,
              day_number: dayNum,
              title: `Day ${dayNum}`,
              info: `Day ${dayNum} content for ${topic}`,
              module_1: modules[`Day ${dayNum} - Module 1`] ? modules[`Day ${dayNum} - Module 1`].content : null,
              module_2: modules[`Day ${dayNum} - Module 2`] ? modules[`Day ${dayNum} - Module 2`].content : null,
              module_3: modules[`Day ${dayNum} - Module 3`] ? modules[`Day ${dayNum} - Module 3`].content : null
            });
          }
        }

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

  const renderPreview = () => {
    if (!previewData) return null;
    
    return (
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-medium">WhatsApp Preview</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(dayNum => {
            const dayKey = `Day${dayNum}`;
            const modules = previewData[dayKey];
            
            if (!modules) return null;
            
            return (
              <div key={dayNum} className="space-y-2">
                <h4 className="font-medium">Day {dayNum}</h4>
                
                {[1, 2, 3].map(moduleNum => {
                  const moduleKey = `Day ${dayNum} - Module ${moduleNum}`;
                  const module = modules[moduleKey];
                  
                  if (!module) return null;
                  
                  return (
                    <div key={moduleKey} className="bg-[#DCF8C6] p-4 rounded-lg max-w-[80%] space-y-2">
                      <p className="font-medium">{module.title}</p>
                      <p className="text-sm">{module.content}</p>
                      <p className="text-xs text-right text-gray-500">12:34 PM ✓✓</p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course On Prompt</CardTitle>
        <CardDescription>
          Use AI to generate a MicroLearn course from your prompt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="course_title"
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
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="The primary topic of the course" 
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
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What is the learning goal for this course?" 
                      className="min-h-[100px] glass-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Style</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                        <SelectItem value="Informational">Informational</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                        <SelectItem value="Marathi">Marathi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  'Generate'
                )}
              </Button>
            </div>
          </form>
        </Form>

        {renderPreview()}
      </CardContent>
    </Card>
  );
};

export default CoursePromptForm;
