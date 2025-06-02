
import React from 'react';
import { Course } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface CoursePreviewProps {
  courses: Course[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CoursePreview: React.FC<CoursePreviewProps> = ({
  courses,
  open,
  onOpenChange
}) => {
  if (!courses || courses.length === 0) return null;

  const courseName = courses[0].course_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{courseName}</DialogTitle>
          <DialogDescription>
            3 Day Course • {courses[0].origin}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 overflow-y-auto flex-1 pr-2">
          <div className="mt-6 space-y-6">
            <h3 className="text-lg font-medium">Course Content</h3>
            
            <div className="space-y-4">
              {courses.map((dayContent, index) => (
                <div key={dayContent.id} className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <h4 className="font-medium">Day {dayContent.day}: {courseName}</h4>
                  </div>
                  <Separator className="my-2" />
                  
                  {dayContent.module_1 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-sm mb-2">Module 1</h5>
                      <p className="text-sm text-muted-foreground">{dayContent.module_1}</p>
                    </div>
                  )}
                  
                  {dayContent.module_2 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-sm mb-2">Module 2</h5>
                      <p className="text-sm text-muted-foreground">{dayContent.module_2}</p>
                    </div>
                  )}
                  
                  {dayContent.module_3 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-sm mb-2">Module 3</h5>
                      <p className="text-sm text-muted-foreground">{dayContent.module_3}</p>
                    </div>
                  )}
                  
                  <div className="mt-4 text-right">
                    <div className="bg-[#DCF8C6] p-2 rounded-lg inline-block max-w-[80%] text-xs">
                      Preview in WhatsApp
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CoursePreview;
