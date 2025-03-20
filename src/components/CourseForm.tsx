
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Loader2, MessageCircle } from 'lucide-react';

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
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Course } from '@/lib/types';

const courseDaySchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  info: z.string().min(10, {
    message: "Please provide more detailed information (min 10 characters).",
  }),
  media_link: z.string().url({
    message: "Please enter a valid URL.",
  }).optional().or(z.literal('')),
});

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  category: z.string().min(1, {
    message: "Please select a category.",
  }),
  language: z.string().min(1, {
    message: "Please select a language.",
  }),
  days: z.array(courseDaySchema).min(1, {
    message: "Please add at least one day content.",
  }),
});

interface CourseFormProps {
  course?: Course;
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>;
  onCancel: () => void;
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
  "Other"
];

const CourseForm: React.FC<CourseFormProps> = ({ 
  course,
  onSubmit,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDay, setPreviewDay] = useState<z.infer<typeof courseDaySchema> | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: course?.name || '',
      description: course?.description || '',
      category: course?.category || '',
      language: course?.language || '',
      days: course?.days?.map(day => ({
        title: day.title,
        info: day.info,
        media_link: day.media_link || ''
      })) || [{ title: '', info: '', media_link: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "days",
  });

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      toast.success(`Course ${course ? 'updated' : 'created'} successfully`);
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = (index: number) => {
    const day = form.getValues().days[index];
    setPreviewDay(day);
    setPreviewOpen(true);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 animate-scale-in">
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>Basic information about the course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter course name" 
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter course description" 
                        className="glass-input resize-none min-h-28" 
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="glass-input">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
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
                          {LANGUAGES.map(language => (
                            <SelectItem key={language} value={language}>
                              {language}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
              <CardDescription>Add day-by-day content for your course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Day {index + 1}</h3>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePreview(index)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`days.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter day title" 
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
                      name={`days.${index}.info`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Information</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter day content information" 
                              className="glass-input resize-none min-h-24" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`days.${index}.media_link`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Media Link (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/media" 
                              className="glass-input" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ title: '', info: '', media_link: '' })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Day
              </Button>
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
                    {course ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  course ? 'Update Course' : 'Save Course'
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>WhatsApp Preview</DialogTitle>
            <DialogDescription>
              This is how your content will appear in WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-[#DCF8C6] p-4 rounded-lg max-w-[80%] space-y-2 my-4">
            <p className="font-medium">{previewDay?.title}</p>
            <p className="text-sm">{previewDay?.info}</p>
            {previewDay?.media_link && (
              <div className="bg-gray-200 p-2 rounded text-xs truncate">
                {previewDay.media_link}
              </div>
            )}
            <p className="text-xs text-right text-gray-500">12:34 PM ✓✓</p>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CourseForm;
