
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
import CourseAssignment from './CourseAssignment';

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
        <LearnerSelector
          open={open}
          onOpenChange={onOpenChange}
          onSelectLearner={handleSelectLearner}
        />
      )}

      {step === 'assign-course' && selectedLearner && course && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Assign Course to {selectedLearner.name}</DialogTitle>
              <DialogDescription>
                Assign "{course.name}" to this learner and set a start date
              </DialogDescription>
            </DialogHeader>
            
            <CourseAssignment
              learner={selectedLearner}
              onAssigned={handleAssigned}
              onCancel={handleCancel}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default CourseAssignmentDialog;
