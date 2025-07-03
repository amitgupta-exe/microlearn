
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Upload, X } from 'lucide-react';
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
import { useMultiAuth } from '@/contexts/MultiAuthContext';
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
  onSuccess?: (courseId?: string) => void;
  onCancel: () => void;
}

const CoursePromptForm: React.FC<CoursePromptFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { user } = useMultiAuth();

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'text/plain', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        toast.error(`File ${file.name} is not a supported type`);
        return false;
      }
      
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        return false;
      }
      
      return true;
    });
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
    event.target.value = ''; // Reset input
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('Submitting course generation request with values:', values);
    
    try {
      setIsLoading(true);

      const { course_title, topic, goal, style, language } = values;

      // Create registration request entry
      const { data: requestData, error: requestError } = await supabase
        .from('registration_requests')
        .insert({
          name: user?.name || 'Unknown',
          number: user?.phone || '',
          course_title,
          topic,
          goal,
          style,
          language,
          approval_status: 'approved'
        })
        .select()
        .single();

      if (requestError) {
        console.error('Error creating registration request:', requestError);
        throw new Error('Failed to create registration request');
      }

      console.log('Registration request created:', requestData);

      // Upload files if any
      let fileUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        console.log('Uploading files:', uploadedFiles.length);
        
        for (const file of uploadedFiles) {
          const fileName = `${requestData.request_id}/${Date.now()}_${file.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('course-materials')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            continue; // Continue with other files
          }

          const { data: { publicUrl } } = supabase.storage
            .from('course-materials')
            .getPublicUrl(fileName);
          
          fileUrls.push(publicUrl);
        }

        console.log('Uploaded file URLs:', fileUrls);
      }

      // Call the edge function to generate course
      console.log('Calling generate-course function...');
      const { data, error } = await supabase.functions.invoke('generate-course', {
        body: {
          prompt: `Create a course about ${topic}. Goal: ${goal}. Style: ${style}. Language: ${language}.`,
          courseName: course_title,
          numDays: 3,
          userId: user?.id,
          requestId: requestData.request_id,
          materialUrls: fileUrls
        }
      });

      console.log('Generate course response:', data, error);

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate course');
      }

      console.log('Course generated successfully:', data);
      
      toast.success('Course generation request submitted successfully!');
      
      // Reset form and files
      form.reset();
      setUploadedFiles([]);
      
      if (onSuccess) {
        onSuccess(data.course?.id);
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

            {/* File Upload Section */}
            <div className="space-y-4">
              <div>
                <FormLabel>Course Materials (Optional)</FormLabel>
                <div className="mt-2">
                  <label className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload images, PDFs, text files, or documents
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Max 10MB per file
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Uploaded Files Display */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded Files:</p>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
