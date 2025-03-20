
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
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CoursePreview: React.FC<CoursePreviewProps> = ({
  course,
  open,
  onOpenChange
}) => {
  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{course.name}</DialogTitle>
          <DialogDescription>
            {course.category} • {course.language}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 overflow-y-auto flex-1 pr-2">
          <p className="text-muted-foreground">{course.description}</p>
          
          <div className="mt-6 space-y-6">
            <h3 className="text-lg font-medium">Course Outline</h3>
            
            <div className="space-y-4">
              {course.days.map((day, index) => (
                <div key={day.id} className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <h4 className="font-medium">Day {index + 1}: {day.title}</h4>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-sm text-muted-foreground">{day.info}</p>
                  
                  {day.media_link && (
                    <div className="mt-2 flex items-center">
                      <div className="bg-muted text-xs p-1.5 rounded">
                        Media: {day.media_link}
                      </div>
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
