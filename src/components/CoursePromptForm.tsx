
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

      // Call our Azure OpenAI Edge Function to generate the course
      const { data: generatedCourse, error } = await supabase.functions.invoke('generate-course', {
        body: { 
          prompt,
          courseName: title,
          numDays: days,
          userId: user?.id
        }
      });

      if (error) {
        console.error("Error generating course:", error);
        toast.error("Failed to generate course. Please try again.");
        return;
      }

      console.log("Course generated successfully:", generatedCourse);
      toast.success("Course generated successfully!");
      
      // Call onSuccess if provided
      if (onSuccess && generatedCourse.course?.id) {
        onSuccess(generatedCourse.course.id);
      }
    } catch (error: any) {
      console.error("Error in course generation:", error);
      toast.error(error.message || "An error occurred while generating course.");
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
