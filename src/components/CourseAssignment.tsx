
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Calendar, PercentIcon } from 'lucide-react';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { Course, Learner, LearnerCourse } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const formSchema = z.object({
  course_id: z.string().min(1, {
    message: "Please select a course.",
  }),
  start_date: z.date({
    required_error: "Please select a start date.",
  }),
  status: z.enum(['scheduled', 'in_progress', 'completed'], {
    required_error: "Please select a status.",
  }),
});

interface CourseAssignmentProps {
  learner: Learner;
  onAssigned: () => void;
  onCancel: () => void;
}

const CourseAssignment: React.FC<CourseAssignmentProps> = ({ 
  learner,
  onAssigned,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: 'scheduled',
    },
  });

  // Fetch available courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Fetch all courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('status', 'active');
          
        if (coursesError) {
          console.error('Error fetching courses:', coursesError);
          toast.error('Failed to load courses');
          return;
        }
        
        // Fetch already assigned courses to this learner
        const { data: assignedCourses, error: assignedError } = await supabase
          .from('learner_courses')
          .select('course_id')
          .eq('learner_id', learner.id);
          
        if (assignedError) {
          console.error('Error fetching assigned courses:', assignedError);
          toast.error('Failed to load assigned courses');
          return;
        }
        
        // Set the assigned course IDs to filter them out
        const assignedIds = assignedCourses.map(ac => ac.course_id);
        setAssignedCourseIds(assignedIds);
        
        // Transform the data to include the days property required by the Course type
        const transformedCourses: Course[] = coursesData.map(course => ({
          ...course,
          days: [] // Add empty days array to satisfy the Course type
        }));
        
        setCourses(transformedCourses);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('An error occurred while loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [learner.id]);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      const newLearnerCourse = {
        learner_id: learner.id,
        course_id: data.course_id,
        start_date: data.start_date.toISOString(),
        status: data.status,
        completion_percentage: data.status === 'completed' ? 100 : 0,
      };
      
      const { error } = await supabase
        .from('learner_courses')
        .insert([newLearnerCourse]);
        
      if (error) {
        console.error('Error assigning course:', error);
        toast.error('Failed to assign course');
        throw error;
      }
      
      toast.success('Course assigned successfully');
      onAssigned();
    } catch (error) {
      console.error('Course assignment error:', error);
      toast.error('Failed to assign course');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out already assigned courses
  const availableCourses = courses.filter(course => 
    !assignedCourseIds.includes(course.id)
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading courses...</span>
            </div>
          ) : availableCourses.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No available courses to assign. All courses have been assigned to this learner.
            </div>
          ) : (
            <FormField
              control={form.control}
              name="course_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Course</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCourses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={`glass-input w-full pl-3 text-left font-normal ${
                          !field.value ? "text-muted-foreground" : ""
                        }`}
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
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end gap-3">
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
            disabled={isSubmitting || availableCourses.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Course'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CourseAssignment;
