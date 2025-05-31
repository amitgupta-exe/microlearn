
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
          .select('*');

        if (error) {
          throw error;
        }

        if (data) {
          const coursesWithDays = data.map(course => ({
            ...course,
            days: [],
          })) as Course[];
          
          setCourses(coursesWithDays);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast.error('Failed to load courses');
      }
    };

    fetchCourses();
  }, []);

  const handleSubmit = async (data: FormData) => {
    if (!user || !selectedCourse) {
      toast.error('You must be logged in to assign a course');
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('learner_courses')
        .insert({
          learner_id: learner.id,
          course_id: selectedCourse.id,
          start_date: data.startDate.toISOString(),
          status: 'scheduled',
        });

      if (error) {
        throw error;
      }

      toast.success("Course assigned successfully!");
      
      try {
        await sendCourseAssignmentNotification(
          learner.name, 
          selectedCourse.name, 
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <Calendar className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePicker
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4">
          <FormLabel>Select Course</FormLabel>
          {courses.map((course) => (
            <Button
              key={course.id}
              variant="outline"
              className={`w-full justify-start ${selectedCourse?.id === course.id ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''}`}
              onClick={() => setSelectedCourse(course)}
            >
              {course.name}
            </Button>
          ))}
        </div>

        <Button type="submit">Assign Course</Button>
      </form>
    </Form>
  );
};

export default CourseAssignment;
