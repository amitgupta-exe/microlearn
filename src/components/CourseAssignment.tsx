import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Course, Learner } from '@/lib/types';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { sendWhatsAppMessage } from '@/integrations/wati/functions';
import CourseOverwriteDialog from './CourseOverwriteDialog';

const formSchema = z.object({
  course: z.string().min(1, {
    message: 'Please select a course.',
  }),
  learner: z.string().min(1, {
    message: 'Please select a learner.',
  }),
});

interface CourseAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  learners: Learner[];
  onSuccess?: () => void;
  selectedCourse?: string;
  selectedLearner?: string;
}

interface CourseAssignmentFormValues {
  course: string;
  learner: string;
}

const CourseAssignment: React.FC<CourseAssignmentProps> = ({
  open,
  onOpenChange,
  courses,
  learners,
  onSuccess,
  selectedCourse,
  selectedLearner,
}) => {
  const { user } = useMultiAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [overwriteDialog, setOverwriteDialog] = useState<{
    open: boolean;
    existingCourse?: Course;
    learner?: Learner;
    newCourse?: Course;
  }>({
    open: false,
  });

  const form = useForm<CourseAssignmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      course: selectedCourse || '',
      learner: selectedLearner || '',
    },
  });

  const onSubmit = async (values: CourseAssignmentFormValues) => {
    setIsLoading(true);

    const learner = learners.find(l => l.id === values.learner);
    const courseRequestId = values.course;

    if (!learner) {
      toast({
        title: 'Error',
        description: 'Learner not found. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (learner.assigned_course_id) {
      // Check if the learner is already assigned to a course
      const existingCourse = courses.find(c => c.id === learner.assigned_course_id);
      const newCourse = courses.find(c => c.request_id === courseRequestId);

      if (existingCourse && newCourse) {
        setOverwriteDialog({
          open: true,
          existingCourse: existingCourse,
          learner: learner,
          newCourse: newCourse,
        });
        setIsLoading(false);
        return;
      }
    }

    const success = await assignCourse(values.learner, courseRequestId);
    if (success) {
      onSuccess && onSuccess();
      onOpenChange(false);
    }

    setIsLoading(false);
  };

  const trackMessage = async (learnerId: string) => {
    try {
      await supabase.from('messages_sent').insert({
        user_id: user?.id!,
        learner_id: learnerId,
        message_type: 'course_assignment',
      });
    } catch (error) {
      console.error('Error tracking message:', error);
    }
  };

  const assignCourse = async (learnerId: string, courseRequestId: string, shouldOverwrite = false) => {
    try {
      // Get the first course from the selected course group
      const selectedCourseGroup = courses.filter(c => c.request_id === courseRequestId);
      const firstCourse = selectedCourseGroup[0];
      
      if (!firstCourse) {
        throw new Error('Course not found');
      }

      const learner = learners.find(l => l.id === learnerId);
      if (!learner) {
        throw new Error('Learner not found');
      }

      // If overwriting, suspend the previous course progress
      if (shouldOverwrite && learner.assigned_course_id) {
        await supabase
          .from('course_progress')
          .update({ status: 'suspended' })
          .eq('learner_id', learnerId)
          .eq('course_id', learner.assigned_course_id);
      }

      // Update learner with new course assignment
      const { error: updateError } = await supabase
        .from('learners')
        .update({ assigned_course_id: firstCourse.id })
        .eq('id', learnerId);

      if (updateError) throw updateError;

      // Create course progress entry
      const { error: progressError } = await supabase
        .from('course_progress')
        .insert({
          learner_id: learnerId,
          course_id: firstCourse.id,
          course_name: firstCourse.course_name,
          learner_name: learner.name,
          phone_number: learner.phone,
          status: 'not_started',
          progress_percent: 0,
        });

      if (progressError) throw progressError;

      // Send WhatsApp message
      try {
        await sendWhatsAppMessage(
          learner.phone,
          `Hello ${learner.name}! You have been assigned to the course "${firstCourse.course_name}". Your learning journey starts now!`,
          process.env.REACT_APP_WATI_API_KEY || ''
        );
        
        // Track the message
        await trackMessage(learnerId);
      } catch (whatsappError) {
        console.error('Error sending WhatsApp message:', whatsappError);
        // Don't fail the assignment if WhatsApp fails
      }

      toast({
        title: 'Course assigned successfully',
        description: `${learner.name} has been assigned to ${firstCourse.course_name}`,
      });

      return true;
    } catch (error) {
      console.error('Error assigning course:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign course. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Course</DialogTitle>
          <DialogDescription>
            Select a course and learner to create a new assignment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="course"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.reduce((uniqueCourses, course) => {
                        if (!uniqueCourses.find(c => c.request_id === course.request_id)) {
                          uniqueCourses.push(course);
                        }
                        return uniqueCourses;
                      }, [] as Course[]).map((course) => (
                        <SelectItem key={course.request_id} value={course.request_id}>
                          {course.course_name}
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
              name="learner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Learner</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a learner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {learners.map((learner) => (
                        <SelectItem key={learner.id} value={learner.id}>
                          {learner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Assigning...' : 'Assign Course'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <CourseOverwriteDialog
        open={overwriteDialog.open}
        onOpenChange={(open) => setOverwriteDialog({ ...overwriteDialog, open })}
        existingCourse={overwriteDialog.existingCourse}
        learner={overwriteDialog.learner}
        newCourse={overwriteDialog.newCourse}
        onConfirm={async () => {
          setIsLoading(true);
          const success = await assignCourse(
            overwriteDialog.learner!.id,
            overwriteDialog.newCourse!.request_id!,
            true
          );
          if (success) {
            onSuccess && onSuccess();
            onOpenChange(false);
          }
          setIsLoading(false);
          setOverwriteDialog({ open: false });
        }}
      />
    </Dialog>
  );
};

export default CourseAssignment;
