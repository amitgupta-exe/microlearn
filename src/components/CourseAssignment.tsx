
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Course, Learner, CourseProgress } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CourseOverwriteDialog from './CourseOverwriteDialog';

interface CourseAssignmentProps {
  learner: Learner;
  preselectedCourses?: Course[];
  onAssigned?: () => void;
  onCancel: () => void;
}

const CourseAssignment: React.FC<CourseAssignmentProps> = ({
  learner,
  preselectedCourses,
  onAssigned,
  onCancel
}) => {
  const [courseGroups, setCourseGroups] = useState<{[key: string]: Course[]}>({});
  const [selectedCourses, setSelectedCourses] = useState<Course[] | null>(preselectedCourses || null);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('status', 'active')
          .order('course_name')
          .order('day');

        if (error) {
          throw error;
        }

        if (data) {
          // Group courses by request_id or course_name
          const grouped: {[key: string]: Course[]} = {};
          data.forEach((course) => {
            const key = course.request_id || course.course_name;
            if (!grouped[key]) {
              grouped[key] = [];
            }
            grouped[key].push(course as Course);
          });
          setCourseGroups(grouped);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast.error('Failed to load courses');
      }
    };

    fetchCourses();
  }, []);

  const handleAssignCourse = async () => {
    if (!user || !selectedCourses || selectedCourses.length === 0) {
      toast.error('You must be logged in and select a course');
      return;
    }

    try {
      // If learner has an existing course, mark it as suspended
      if (learner.assigned_course_id) {
        await supabase
          .from('course_progress')
          .update({ status: 'suspended' })
          .eq('learner_id', learner.id)
          .eq('course_id', learner.assigned_course_id);
      }

      // Update learner's assigned course
      const { error: learnerError } = await supabase
        .from('learners')
        .update({
          assigned_course_id: selectedCourses[0].id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', learner.id);

      if (learnerError) {
        throw learnerError;
      }

      // Create course progress entry
      const { error: progressError } = await supabase
        .from('course_progress')
        .insert({
          learner_id: learner.id,
          course_id: selectedCourses[0].id,
          status: 'not_started'
        });

      if (progressError) {
        throw progressError;
      }

      // Send WhatsApp message
      try {
        await fetch('/api/whatsapp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: learner.phone,
            message: `${selectedCourses[0].course_name} course is assigned to you. Press Let's MicroLearn to start learning.`,
            learner_name: learner.name
          })
        });
      } catch (error) {
        console.error("Error sending WhatsApp notification:", error);
      }

      toast.success("Course assigned successfully!");
      
      if (onAssigned) {
        onAssigned();
      }
    } catch (error: any) {
      console.error('Error assigning course:', error);
      toast.error(`Failed to assign course: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCourses) {
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
      <div className="space-y-6">
        <div className="grid gap-4">
          <label className="font-medium">Select Course</label>
          {Object.entries(courseGroups).map(([key, courses]) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              className={`w-full justify-start ${selectedCourses && selectedCourses[0]?.course_name === courses[0].course_name ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''}`}
              onClick={() => setSelectedCourses(courses)}
            >
              <div className="text-left">
                <div className="font-medium">{courses[0].course_name}</div>
                <div className="text-sm text-muted-foreground">{courses.length} days</div>
              </div>
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedCourses}>
            Assign Course
          </Button>
        </div>
      </div>

      {selectedCourses && (
        <CourseOverwriteDialog
          open={showOverwriteDialog}
          onOpenChange={setShowOverwriteDialog}
          learner={learner}
          newCourse={selectedCourses[0]}
          onConfirm={handleOverwriteConfirm}
        />
      )}
    </>
  );
};

export default CourseAssignment;
