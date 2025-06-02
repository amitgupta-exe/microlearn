
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CourseDetailDialogProps {
  courses: Course[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CourseDetailDialog: React.FC<CourseDetailDialogProps> = ({
  courses,
  open,
  onOpenChange
}) => {
  if (!courses || courses.length === 0) return null;

  const courseName = courses[0].course_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{courseName}</DialogTitle>
          <DialogDescription>
            3 Day Course • {courses[0].visibility === 'public' ? 'Public' : 'Private'} Course
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 overflow-y-auto flex-1 pr-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Total Days</h4>
                  <p className="text-2xl font-semibold">{courses.length}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Status</h4>
                  <div className="flex items-center">
                    <div className={`h-2 w-2 rounded-full mr-2 ${courses[0].status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <p className="text-sm font-medium">{courses[0].status.charAt(0).toUpperCase() + courses[0].status.slice(1)}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="modules" className="space-y-6">
              {courses.map((dayContent) => (
                <div key={dayContent.id} className="border rounded-lg">
                  <div className="bg-muted/30 p-4 font-medium">
                    Day {dayContent.day}: {courseName}
                  </div>
                  <div className="p-4 space-y-4">
                    
                    {dayContent.module_1 && (
                      <div className="border-l-2 border-primary pl-4 py-2">
                        <h4 className="font-medium text-sm mb-1">Module 1</h4>
                        <p className="text-sm">{dayContent.module_1}</p>
                      </div>
                    )}
                    
                    {dayContent.module_2 && (
                      <div className="border-l-2 border-primary/70 pl-4 py-2">
                        <h4 className="font-medium text-sm mb-1">Module 2</h4>
                        <p className="text-sm">{dayContent.module_2}</p>
                      </div>
                    )}
                    
                    {dayContent.module_3 && (
                      <div className="border-l-2 border-primary/50 pl-4 py-2">
                        <h4 className="font-medium text-sm mb-1">Module 3</h4>
                        <p className="text-sm">{dayContent.module_3}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourseDetailDialog;
