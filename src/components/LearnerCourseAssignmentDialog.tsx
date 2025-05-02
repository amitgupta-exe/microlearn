
import React, { useState } from 'react';
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LearnerCourseAssignmentDialog: React.FC<LearnerCourseAssignmentDialogProps> = ({
  learner,
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
            Select a course to assign to this learner and set a start date
          </DialogDescription>
        </DialogHeader>
        
        <CourseAssignment
          learner={learner}
          onAssigned={handleAssigned}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
};

export default LearnerCourseAssignmentDialog;
