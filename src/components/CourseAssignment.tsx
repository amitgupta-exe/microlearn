
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar } from "lucide-react";
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Course, Learner } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { sendCourseAssignmentNotification } from '@/lib/whatsapp-notifications';
import CourseOverwriteDialog from './CourseOverwriteDialog';

const formSchema = z.object({
  startDate: z.date(),
  courseId: z.string().uuid(),
});

type FormData = z.infer<typeof formSchema>;

interface CourseAssignmentProps {
  learner: Learner;
  preselectedCourse?: Course;
  onAssigned?: () => void;
  onCancel: () => void;
}

const CourseAssignment: React.FC<CourseAssignmentProps> = ({
  learner,
  preselectedCourse,
  onAssigned,
  onCancel
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(preselectedCourse || null);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: new Date(),
      courseId: preselectedCourse?.id || '',
    },
  });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('status', 'active');

        if (error) {
          throw error;
        }

        if (data) {
          setCourses(data as Course[]);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast.error('Failed to load courses');
      }
    };

    fetchCourses();
  }, []);

  const handleAssignCourse = async () => {
    if (!user || !selectedCourse) {
      toast.error('You must be logged in to assign a course');
      return;
    }

    try {
      // Update learner's assigned course
      const { error } = await supabase
        .from('learners')
        .update({
          assigned_course_id: selectedCourse.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', learner.id);

      if (error) {
        throw error;
      }

      toast.success("Course assigned successfully!");
      
      try {
        // Send notification based on whether it's an overwrite or new assignment
        const notificationMessage = learner.assigned_course_id 
          ? `Your previous course has been suspended. New course assigned: ${selectedCourse.course_name}. Press Let's MicroLearn to start learning.`
          : `${selectedCourse.course_name} course is assigned to you. Press Let's MicroLearn to start learning.`;
          
        await sendCourseAssignmentNotification(
          learner.name, 
          selectedCourse.course_name, 
          learner.phone
        );
      } catch (error) {
        console.error("Error sending WhatsApp notification:", error);
      }
      
      if (onAssigned) {
        onAssigned();
      }
    } catch (error: any) {
      console.error('Error assigning course:', error);
      toast.error(`Failed to assign course: ${error.message}`);
    }
  };

  const handleSubmit = async (data: FormData) => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    // Check if learner already has a course assigned
    if (learner.assigned_course_id && learner.assigned_course) {
      setShowOverwriteDialog(true);
    } else {
      await handleAssignCourse();
    }
  };

  const handleOverwriteConfirm = async () => {
    setShowOverwriteDialog(false);
    await handleAssignCourse();
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid gap-4">
            <FormLabel>Select Course</FormLabel>
            {courses.map((course) => (
              <Button
                key={course.id}
                type="button"
                variant="outline"
                className={`w-full justify-start ${selectedCourse?.id === course.id ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''}`}
                onClick={() => {
                  setSelectedCourse(course);
                  form.setValue('courseId', course.id);
                }}
              >
                <div className="text-left">
                  <div className="font-medium">{course.course_name}</div>
                  <div className="text-sm text-muted-foreground">Day {course.day}</div>
                </div>
              </Button>
            ))}
          </div>

          <Button type="submit" disabled={!selectedCourse}>
            Assign Course
          </Button>
        </form>
      </Form>

      {selectedCourse && (
        <CourseOverwriteDialog
          open={showOverwriteDialog}
          onOpenChange={setShowOverwriteDialog}
          learner={learner}
          newCourse={selectedCourse}
          onConfirm={handleOverwriteConfirm}
        />
      )}
    </>
  );
};

export default CourseAssignment;
