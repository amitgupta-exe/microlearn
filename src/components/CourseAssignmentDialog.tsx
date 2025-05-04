
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Course, Learner } from '@/lib/types';
import LearnerSelector from './LearnerSelector';
import LearnerCourseAssignmentDialog from './LearnerCourseAssignmentDialog';

interface CourseAssignmentDialogProps {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CourseAssignmentDialog: React.FC<CourseAssignmentDialogProps> = ({
  course,
  open,
  onOpenChange
}) => {
  const [step, setStep] = useState<'select-learner' | 'assign-course'>('select-learner');
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);

  const handleSelectLearner = (learner: Learner) => {
    setSelectedLearner(learner);
    setStep('assign-course');
  };

  const handleAssigned = () => {
    setStep('select-learner');
    setSelectedLearner(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (step === 'assign-course') {
      setStep('select-learner');
      setSelectedLearner(null);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <>
      {step === 'select-learner' && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Select Learner</DialogTitle>
              <DialogDescription>
                Choose a learner to assign "{course?.name}" to
              </DialogDescription>
            </DialogHeader>
            <LearnerSelector
              open={true} // This is controlled by the parent Dialog
              onOpenChange={() => {}} // Controlled by parent Dialog
              onSelectLearner={handleSelectLearner}
            />
          </DialogContent>
        </Dialog>
      )}

      {step === 'assign-course' && selectedLearner && (
        <LearnerCourseAssignmentDialog
          learner={selectedLearner}
          course={course}
          open={open}
          onOpenChange={onOpenChange}
        />
      )}
    </>
  );
};

export default CourseAssignmentDialog;
