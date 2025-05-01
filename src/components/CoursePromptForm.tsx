
import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Course name must be at least 2 characters.",
  }),
  category: z.string().min(1, {
    message: "Please select a category.",
  }),
  language: z.string().min(1, {
    message: "Please select a language.",
  }),
  promptTemplate: z.string().min(1, {
    message: "Please select a prompt template or enter a custom prompt."
  }),
  customPrompt: z.string().optional(),
  topic: z.string().min(1, {
    message: "Please enter a topic for your course."
  }),
  style: z.string().optional(),
  visibility: z.enum(['public', 'private']).default('private')
});

interface CourseTemplate {
  id: string;
  name: string;
  prompt: string;
}

interface CoursePromptFormProps {
  onCancel: () => void;
  onSuccess: (courseId: string) => void;
}

const CATEGORIES = [
  "Programming",
  "Design",
  "Marketing",
  "Business",
  "Personal Development",
  "Language Learning",
  "Other"
];

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Russian",
  "Arabic",
  "Hindi",
  "Other"
];

const TEACHING_STYLES = [
  "Conversational",
  "Academic",
  "Professional",
  "Entertaining",
  "Step-by-step",
  "Socratic",
  "Storytelling"
];

const CoursePromptForm: React.FC<CoursePromptFormProps> = ({ onCancel, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      language: 'English',
      promptTemplate: 'custom',
      customPrompt: '',
      topic: '',
      style: 'Professional',
      visibility: 'private'
    },
  });

  const selectedTemplate = form.watch('promptTemplate');
  const isCustomPrompt = selectedTemplate === 'custom';

  // Load templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('course_prompt_templates')
          .select('*');
        
        if (error) {
          throw error;
        }
        
        setTemplates(data || []);
        
        // Set default template if available
        if (data && data.length > 0) {
          form.setValue('promptTemplate', data[0].id);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        toast.error('Failed to load prompt templates');
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    
    fetchTemplates();
  }, []);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast.error('You must be logged in to create courses');
        return;
      }
      
      // Get the prompt text based on selection
      let promptText = '';
      
      if (isCustomPrompt) {
        promptText = values.customPrompt || '';
      } else {
        const selectedTemplateObj = templates.find(t => t.id === values.promptTemplate);
        promptText = selectedTemplateObj?.prompt || '';
      }
      
      if (!promptText) {
        toast.error('No prompt text provided');
        return;
      }
      
      // Generate course content using the edge function
      const { data: generatedCourse, error: generateError } = await supabase.functions.invoke(
        'generate-course',
        {
          body: {
            promptText,
            templateVariables: {
              topic: values.topic,
              language: values.language,
              style: values.style
            }
          }
        }
      );
      
      if (generateError || !generatedCourse?.course) {
        console.error('Error generating course:', generateError || 'No course data returned');
        toast.error('Failed to generate course content');
        return;
      }
      
      // Step 1: Create the course entry
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          name: values.name,
          description: `A course about ${values.topic} in ${values.language} style.`,
          category: values.category,
          language: values.language,
          status: 'active',
          created_by: userData.user.id,
          visibility: values.visibility
        })
        .select()
        .single();
      
      if (courseError || !courseData) {
        console.error('Error creating course:', courseError);
        toast.error('Failed to create course');
        return;
      }
      
      // Step 2: Add course days from generated content
      const courseDays = [];
      
      // Process the generated content into days
      for (let i = 1; i <= 3; i++) {
        const day = generatedCourse.course[`day${i}`];
        if (day) {
          courseDays.push({
            course_id: courseData.id,
            day_number: i,
            title: `Day ${i}`,
            info: `Day ${i} of ${values.name}`,
            module_1: day.module1?.content || '',
            module_2: day.module2?.content || '',
            module_3: day.module3?.content || ''
          });
        }
      }
      
      if (courseDays.length > 0) {
        const { error: daysError } = await supabase
          .from('course_days')
          .insert(courseDays);
        
        if (daysError) {
          console.error('Error adding course days:', daysError);
          toast.error('Failed to add course days');
          // Consider deleting the course if this fails
          return;
        }
      }
      
      toast.success('Course created successfully');
      onSuccess(courseData.id);
      
    } catch (error) {
      console.error('Course creation error:', error);
      toast.error('An error occurred while creating the course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Create Course from Prompt</CardTitle>
            <CardDescription>
              Use AI to generate a complete course structure and content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter course name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGES.map(language => (
                          <SelectItem key={language} value={language}>{language}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. JavaScript Basics, Digital Marketing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teaching Style</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teaching style" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEACHING_STYLES.map(style => (
                        <SelectItem key={style} value={style}>{style}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Visibility</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="private">Private (Only you can access)</SelectItem>
                      <SelectItem value="public">Public (Anyone can access)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="promptTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt Template</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a prompt template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingTemplates ? (
                        <SelectItem value="loading" disabled>
                          Loading templates...
                        </SelectItem>
                      ) : templates.length > 0 ? (
                        <>
                          {templates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Custom Prompt</SelectItem>
                        </>
                      ) : (
                        <SelectItem value="custom">Custom Prompt</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isCustomPrompt && (
              <FormField
                control={form.control}
                name="customPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Prompt</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your custom prompt here..."
                        className="min-h-[200px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Course...
                </>
              ) : 'Generate Course'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};

export default CoursePromptForm;
