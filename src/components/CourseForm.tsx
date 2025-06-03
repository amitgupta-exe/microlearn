import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, MessageCircle } from 'lucide-react';

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

const moduleSchema = z.object({
  module_name: z.string().min(1, { message: "Module name required" }),
  content: z.string().min(1, { message: "Module content required" }),
  media_link: z.string().url({ message: "Enter a valid URL" }).optional().or(z.literal('')),
});

const daySchema = z.object({
  modules: z.array(moduleSchema).length(3),
});

const formSchema = z.object({
  course_name: z.string().min(2, { message: "Course name required" }),
  days: z.array(daySchema).length(3),
});

type FormType = z.infer<typeof formSchema>;

interface CourseFormProps {
  course?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const emptyModule = { module_name: '', content: '', media_link: '' };

const CourseForm: React.FC<CourseFormProps> = ({
  course,
  onSubmit,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewModule, setPreviewModule] = useState<{
    module_name: string;
    content: string;
    media_link?: string;
  } | null>(null);

  // Helper to parse concatenated module string back to object
  function parseModule(str: string) {
    try {
      const obj = JSON.parse(str);
      return {
        module_name: obj.module_name || '',
        content: obj.content || '',
        media_link: obj.media_link || '',
      };
    } catch {
      const [module_name, content, media_link] = str.split('||');
      return { module_name, content, media_link };
    }
  }

  // Helper to concatenate module fields
  function concatModule(module: { module_name: string; content: string; media_link?: string }) {
    return JSON.stringify(module);
  }

  // Prepare default values: always 3 days, each with 3 modules
  const defaultDays =
    course?.days?.length === 3
      ? course.days.map((day: any) => ({
          modules: [
            ...(day.module_1 ? [parseModule(day.module_1)] : [emptyModule]),
            ...(day.module_2 ? [parseModule(day.module_2)] : [emptyModule]),
            ...(day.module_3 ? [parseModule(day.module_3)] : [emptyModule]),
          ].slice(0, 3),
        }))
      : Array.from({ length: 3 }, () => ({
          modules: [emptyModule, emptyModule, emptyModule],
        }));

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      course_name: course?.course_name || '',
      days: defaultDays,
    },
  });

  const handleSubmit = async (data: FormType) => {
    try {
      setIsSubmitting(true);

      // Prepare modules for each day
      const formattedDays = data.days.map((day, dayIdx) => {
        const modules = day.modules.map(concatModule);
        return {
          day: dayIdx + 1,
          module_1: modules[0] || null,
          module_2: modules[1] || null,
          module_3: modules[2] || null,
        };
      });

      await onSubmit({
        course_name: data.course_name,
        days: formattedDays,
      });

      toast.success(`Course ${course ? 'updated' : 'created'} successfully`);
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = (module: { module_name: string; content: string; media_link?: string }) => {
    setPreviewModule(module);
    setPreviewOpen(true);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 animate-scale-in">
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>Enter the course name and fill in up to 3 days, each with 3 modules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="course_name"
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
              <CardDescription>
                Fill in all 3 days. Each day has 3 modules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Array.from({ length: 3 }).map((_, dayIdx) => (
                <div key={dayIdx} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Day {dayIdx + 1}</h3>
                  </div>
                  <Separator />
                  <Controller
                    control={form.control}
                    name={`days.${dayIdx}.modules`}
                    render={({ field }) => (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, modIdx) => (
                          <div key={modIdx} className="border p-3 rounded-lg bg-muted/50">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">Module {modIdx + 1}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handlePreview({
                                    module_name: field.value[modIdx]?.module_name ?? '',
                                    content: field.value[modIdx]?.content ?? '',
                                    media_link: field.value[modIdx]?.media_link ?? '',
                                  })
                                }
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <Input
                                placeholder="Module Name"
                                value={field.value[modIdx]?.module_name || ''}
                                onChange={e => {
                                  const newModules = [...field.value];
                                  newModules[modIdx] = {
                                    ...newModules[modIdx],
                                    module_name: e.target.value,
                                  };
                                  field.onChange(newModules);
                                }}
                              />
                              <Textarea
                                placeholder="Module Content"
                                value={field.value[modIdx]?.content || ''}
                                onChange={e => {
                                  const newModules = [...field.value];
                                  newModules[modIdx] = {
                                    ...newModules[modIdx],
                                    content: e.target.value,
                                  };
                                  field.onChange(newModules);
                                }}
                              />
                              <Input
                                placeholder="Media Link (optional)"
                                value={field.value[modIdx]?.media_link || ''}
                                onChange={e => {
                                  const newModules = [...field.value];
                                  newModules[modIdx] = {
                                    ...newModules[modIdx],
                                    media_link: e.target.value,
                                  };
                                  field.onChange(newModules);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </div>
              ))}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {course ? 'Updating...' : 'Creating...'}
                  </>
                ) : course ? 'Update Course' : 'Save Course'}
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
              This is how your module will appear in WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#DCF8C6] p-4 rounded-lg max-w-[80%] space-y-2 my-4">
            <p className="font-medium">{previewModule?.module_name}</p>
            <p className="text-sm">{previewModule?.content}</p>
            {previewModule?.media_link && (
              <div className="bg-gray-200 p-2 rounded text-xs truncate">
                {previewModule.media_link}
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
