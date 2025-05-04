
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Course, Learner } from '@/lib/types';
import CourseAssignment from './CourseAssignment';

interface LearnerCourseAssignmentDialogProps {
  learner: Learner | null;
  course?: Course | null; // Make course optional
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LearnerCourseAssignmentDialog: React.FC<LearnerCourseAssignmentDialogProps> = ({
  learner,
  course,
  open,
  onOpenChange
}) => {
  const handleAssigned = () => {
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!learner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Course to {learner.name}</DialogTitle>
          <DialogDescription>
            {course ? 
              `Assign "${course.name}" to ${learner.name} and set a start date` : 
              `Select a course to assign to ${learner.name} and set a start date`
            }
          </DialogDescription>
        </DialogHeader>
        
        <CourseAssignment
          learner={learner}
          preselectedCourse={course || undefined}
          onAssigned={handleAssigned}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
};

export default LearnerCourseAssignmentDialog;
