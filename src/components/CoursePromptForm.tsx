import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Upload, X, Save, Eye } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [generatedCourse, setGeneratedCourse] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);
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
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        toast.error(`File ${file.name} is not a supported type. Only PDF and DOCX files are allowed.`);
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

  // Extract text from PDF files using PDF.js
  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return fullText.trim();
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      toast.error(`Failed to extract text from ${file.name}`);
      return '';
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('Submitting course generation request with values:', values);

    try {
      setIsLoading(true);
      setGeneratedCourse(null);

      const { course_title, topic, goal, style, language } = values;

      // Extract text from PDF files
      let extractedPdfText = 'No specific context'; // Default value
      if (uploadedFiles.length > 0) {
        console.log('Processing uploaded files:', uploadedFiles.length);
        
        let pdfText = '';
        for (const file of uploadedFiles) {
          if (file.type === 'application/pdf') {
            const extractedText = await extractPdfText(file);
            if (extractedText) {
              pdfText += extractedText + '\n\n';
            }
          }
          // You can add DOCX processing here if needed using mammoth.js
        }
        
        // If we extracted any text, use it; otherwise keep default
        if (pdfText.trim()) {
          extractedPdfText = pdfText.trim();
        }
      }

      console.log('Extracted PDF text length:', extractedPdfText.length);

      // Send as JSON instead of FormData since the backend expects JSON
      const requestBody = {
        extracted_pdf_text: extractedPdfText,
        topic,
        goal,
        style,
        language
      };

      console.log('Calling API with request body:', {
        ...requestBody,
        extracted_pdf_text: `${extractedPdfText.substring(0, 100)}${extractedPdfText.length > 100 ? '...' : ''}`
      });

      // Call API
      const response = await fetch('http://localhost:3002/api/generate-course', {
      // const response = await fetch('https://microlearn-backend-b2fba3bvbuejcehm.southindia-01.azurewebsites.net/api/generate-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const courseData = await response.json();
      console.log('Generate course response:', courseData);

      // if (!courseData.success) {
      //   throw new Error(courseData.error || 'Failed to generate course');
      // }

      console.log('Course generated successfully:', courseData.text);

      // Store the generated course and form data
      setGeneratedCourse(courseData.text);
      setFormData({
        course_title,
        topic,
        goal,
        style,
        language,
        hasDocument: uploadedFiles.length > 0,
        extractedText: extractedPdfText !== 'No specific context' ? extractedPdfText.substring(0, 200) + '...' : 'No specific context'
      });

      toast.success('Course generated successfully! Review and save to database.');

    } catch (error: any) {
      console.error("Error in course generation:", error);

      let errorMessage = 'An error occurred while generating the course.';
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!generatedCourse || !formData) {
      toast.error('No course to save');
      return;
    }

    try {
      setIsSaving(true);

      // Generate a unique course ID for this course
      const courseId = crypto.randomUUID();

      console.log('[DEBUG] Raw generated course:', generatedCourse);

      // Parse the generated course content
      const match = generatedCourse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      let jsonString;
      if (match) {
        jsonString = match[1];
      } else {
        const braceMatch = generatedCourse.match(/\{[\s\S]*\}/);
        jsonString = braceMatch ? braceMatch[0] : null;
      }

      if (!jsonString) {
        console.log("Can't extract JSON - saving as plain text");
        // Save as plain text if no JSON structure found
        const { error: courseInsertError } = await supabase
          .from('courses')
          .insert({
            id: crypto.randomUUID(),
            course_name: formData.course_title,
            origin: 'microlearn_cop',
            created_by: user?.id,
            request_id: courseId,
            course_data: generatedCourse,
            visibility: 'public',
            status: 'approved',
            day: 1,
            module_1: generatedCourse,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (courseInsertError) {
          throw new Error('Failed to save course');
        }

        toast.success('Course saved to database successfully!');
        resetForm();
        return;
      }

      // Parse JSON
      let course;
      try {
        // Clean the JSON string before parsing
        jsonString = jsonString.trim()
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
          .replace(/\\/g, '\\\\') // Escape backslashes
          .replace(/"/g, '"'); // Normalize quotes
      
        course = JSON.parse(jsonString);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        throw new Error('Failed to parse course structure');
      }

      // Insert each day and module into courses
      let dayNum = 1;
      for (const dayKey of Object.keys(course)) {
        const modules = course[dayKey];
        const insertObj = {
          id: crypto.randomUUID(),
          request_id: courseId,
          course_name: formData.course_title,
          visibility: "public",
          origin: "microlearn_cop",
          status: "approved",
          day: dayNum,
          module_1: modules[`Day ${dayNum} - Module 1`] ? modules[`Day ${dayNum} - Module 1`]["content"] : null,
          module_2: modules[`Day ${dayNum} - Module 2`] ? modules[`Day ${dayNum} - Module 2`]["content"] : null,
          module_3: modules[`Day ${dayNum} - Module 3`] ? modules[`Day ${dayNum} - Module 3`]["content"] : null,
          created_by: user?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('courses').insert([insertObj]).select();
        if (error) {
          console.error(`Supabase insert error on day ${dayNum}:`, error);
          throw new Error(`Failed to save day ${dayNum}`);
        }
        dayNum++;
      }

      toast.success(`Course saved successfully! (${dayNum - 1} days created)`);
      resetForm();

    } catch (error: any) {
      console.error("Error saving course:", error);
      toast.error(error.message || "Failed to save course to database");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to reset form state
  const resetForm = () => {
    form.reset();
    setUploadedFiles([]);
    setGeneratedCourse(null);
    setFormData(null);

    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="space-y-6">
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
                    <FormLabel>📚 Course Title</FormLabel>
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
                    <FormLabel>📝 Topic</FormLabel>
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
                    <FormLabel>🎯 Goal</FormLabel>
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
                      <FormLabel>🎨 Style</FormLabel>
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
                      <FormLabel>🌐 Language</FormLabel>
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
                  <FormLabel>📄 Course Materials (Optional)</FormLabel>
                  <div className="mt-2">
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload PDF or DOCX files
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Max 10MB per file
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.docx"
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
                        <span className="text-sm truncate">
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
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
                    'Generate Course 🚀'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Generated Course Display */}
      {generatedCourse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Generated Course Content
            </CardTitle>
            <CardDescription>
              Review the generated course content below and save it to the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formData && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Course Details:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Title:</strong> {formData.course_title}</div>
                  <div><strong>Topic:</strong> {formData.topic}</div>
                  <div><strong>Style:</strong> {formData.style}</div>
                  <div><strong>Language:</strong> {formData.language}</div>
                  <div className="col-span-2"><strong>Goal:</strong> {formData.goal}</div>
                  <div><strong>Document:</strong> {formData.hasDocument ? 'Processed and included' : 'None uploaded'}</div>
                </div>
              </div>
            )}

            <div className="bg-white border rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {generatedCourse}
              </pre>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleSaveCourse}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save to Database
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CoursePromptForm;