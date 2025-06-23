
import React, { useState, useEffect } from 'react';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, Calendar, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Learner } from '@/lib/types';
import ConfirmDialog from '@/components/ConfirmDialog';
import { sendCourseAssignmentNotification, sendCourseSuspensionNotification } from '@/integrations/wati/functions';
import { normalizePhoneNumber } from '@/lib/utils';

interface Course {
  id: string;
  course_name: string;
  day: number;
  created_at: string;
  status: string;
  request_id: string;
  visibility: string;
}

interface AssignLearnerToCourseProps {
  learner: Learner;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Component for assigning courses to a specific learner
 * Shows available courses and handles assignment with overwrite confirmation
 */
const AssignLearnerToCourse: React.FC<AssignLearnerToCourseProps> = ({
  learner,
  onSuccess,
  onCancel
}) => {
  const { user } = useMultiAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    course?: Course;
    existingCourse?: string;
  }>({ open: false });

  console.log('AssignLearnerToCourse - learner:', learner.name, 'user:', user?.id);

  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  /**
   * Fetch all approved courses available for assignment
   */
  const fetchAvailableCourses = async () => {
    try {
      console.log('📚 Fetching available courses for assignment...');
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching courses:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch available courses',
          variant: 'destructive',
        });
        return;
      }

      console.log('📋 Available courses:', data?.length);
      
      // Group courses by request_id and take the latest one for each request_id
      const uniqueCourses = data?.reduce((acc: Course[], course) => {
        const existingCourse = acc.find(c => c.request_id === course.request_id);
        if (!existingCourse) {
          acc.push(course);
        }
        return acc;
      }, []) || [];

      console.log('✅ Unique courses (grouped by request_id):', uniqueCourses.length);
      setCourses(uniqueCourses);
    } catch (error) {
      console.error('💥 Exception fetching courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch courses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if learner has existing active course progress
   */
  const checkExistingProgress = async (): Promise<string | null> => {
    const normalizedPhone = normalizePhoneNumber(learner.phone);
    
    const { data: existingActive } = await supabase
      .from('course_progress')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .in('status', ['assigned', 'started']);

    if (existingActive && existingActive.length > 0) {
      return existingActive[0].course_name;
    }

    return null;
  };

  /**
   * Handle course assignment with confirmation for overwrites
   */
  const handleAssignCourse = async (course: Course, confirmOverwrite: boolean = false) => {
    // Check for existing active courses if not confirming overwrite
    if (!confirmOverwrite) {
      const existingCourseName = await checkExistingProgress();
      if (existingCourseName) {
        setConfirmDialog({
          open: true,
          course,
          existingCourse: existingCourseName
        });
        return;
      }
    }

    setAssigning(course.id);

    try {
      console.log('📝 Assigning course:', course.course_name, 'to learner:', learner.name);

      const normalizedPhone = normalizePhoneNumber(learner.phone);

      // If confirming overwrite, suspend existing courses
      if (confirmOverwrite) {
        console.log('⏸️ Suspending existing active courses...');
        
        const { data: existingCourses } = await supabase
          .from('course_progress')
          .select('*')
          .eq('phone_number', normalizedPhone)
          .in('status', ['assigned', 'started']);

        if (existingCourses && existingCourses.length > 0) {
          await supabase
            .from('course_progress')
            .update({ status: 'suspended' })
            .eq('phone_number', normalizedPhone)
            .in('status', ['assigned', 'started']);

          // Send suspension notification for existing courses
          for (const existingCourse of existingCourses) {
            try {
              await sendCourseSuspensionNotification(
                learner.name,
                existingCourse.course_name,
                normalizedPhone
              );
            } catch (notificationError) {
              console.warn('⚠️ Failed to send suspension notification:', notificationError);
            }
          }
        }
      }

      // Create new course progress entry
      const { data: progressData, error: progressError } = await supabase
        .from('course_progress')
        .insert({
          learner_id: learner.id,
          course_id: course.id,
          learner_name: learner.name,
          phone_number: normalizedPhone,
          course_name: course.course_name,
          current_day: 1,
          progress_percent: 0,
          status: 'assigned',
          started_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (progressError) {
        console.error('❌ Error creating course progress:', progressError);
        toast({
          title: 'Assignment Failed',
          description: progressError.message,
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Successfully assigned course:', progressData);

      // Send WhatsApp notification for new assignment
      try {
        await sendCourseAssignmentNotification(
          learner.name,
          course.course_name,
          normalizedPhone
        );
        console.log('📱 WhatsApp notification sent successfully');
      } catch (notificationError) {
        console.warn('⚠️ Failed to send WhatsApp notification:', notificationError);
        // Don't fail the assignment if notification fails
      }

      toast({
        title: 'Course Assigned Successfully',
        description: `${course.course_name} has been assigned to ${learner.name}`,
      });

      // Call success callback
      onSuccess?.();
    } catch (error) {
      console.error('💥 Exception during course assignment:', error);
      toast({
        title: 'Assignment Error',
        description: 'Failed to assign course to learner',
        variant: 'destructive',
      });
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading available courses...</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Assign Course to {learner.name}</h3>
            <p className="text-sm text-muted-foreground">
              Choose a course to assign to this learner
            </p>
          </div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No approved courses available for assignment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{course.course_name}</CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {course.visibility}
                    </Badge>
                  </div>
                  <CardDescription>
                    {course.day} day{course.day > 1 ? 's' : ''} • Created {new Date(course.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      Duration: {course.day} day{course.day > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created: {new Date(course.created_at).toLocaleDateString()}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleAssignCourse(course)}
                      disabled={assigning === course.id}
                    >
                      {assigning === course.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        'Assign Course'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Course Overwrite */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open })}
        title="Overwrite Current Course?"
        description={`${learner.name} is currently assigned to "${confirmDialog.existingCourse}". Assigning "${confirmDialog.course?.course_name}" will suspend their current progress. Continue?`}
        confirmText="Yes, Assign New Course"
        cancelText="Cancel"
        onConfirm={() => {
          if (confirmDialog.course) {
            handleAssignCourse(confirmDialog.course, true);
          }
        }}
        variant="destructive"
      />
    </>
  );
};

export default AssignLearnerToCourse;
