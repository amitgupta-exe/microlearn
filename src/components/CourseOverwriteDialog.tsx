
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Learner, Course } from '@/lib/types';

interface CourseOverwriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learner: Learner;
  newCourse: Course;
  onConfirm: () => void;
}

const CourseOverwriteDialog: React.FC<CourseOverwriteDialogProps> = ({
  open,
  onOpenChange,
  learner,
  newCourse,
  onConfirm
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Course Already Assigned</DialogTitle>
          <DialogDescription>
            {learner.name} is already enrolled in "{learner.assigned_course?.course_name}". 
            Do you want to overwrite this assignment with "{newCourse.course_name}"?
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The previous course will be suspended and a notification 
                will be sent about the new course assignment.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Overwrite Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourseOverwriteDialog;
