
import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Learner, Course } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CourseAssignment from './CourseAssignment';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LearnerCoursesProps {
  learner: Learner;
}

const LearnerCourses: React.FC<LearnerCoursesProps> = ({ learner }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [assignedCourse, setAssignedCourse] = useState<Course | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  const fetchAssignedCourse = async () => {
    try {
      setIsLoading(true);
      
      if (learner.assigned_course_id) {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', learner.assigned_course_id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching assigned course:', error);
          toast.error('Failed to load assigned course');
          return;
        }
        
        if (data) {
          setAssignedCourse(data as Course);
        }
      } else {
        setAssignedCourse(null);
      }
    } catch (error) {
      console.error('Error in assigned course fetch:', error);
      toast.error('An error occurred while loading assigned course');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (learner && learner.id) {
      fetchAssignedCourse();
    }
  }, [learner]);
  
  const handleRemoveCourse = async () => {
    try {
      const { error } = await supabase
        .from('learners')
        .update({
          assigned_course_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', learner.id);
        
      if (error) {
        console.error('Error removing course:', error);
        toast.error('Failed to remove course');
        return;
      }
      
      toast.success('Course removed successfully');
      setAssignedCourse(null);
    } catch (error) {
      console.error('Error removing course:', error);
      toast.error('Failed to remove course');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Assigned Course</CardTitle>
            <CardDescription>
              Course assigned to {learner.name}
            </CardDescription>
          </div>
          <Button onClick={() => setIsAssignDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {assignedCourse ? 'Change Course' : 'Assign Course'}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading course...</span>
            </div>
          ) : assignedCourse ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{assignedCourse.course_name}</h3>
                  <p className="text-sm text-muted-foreground">Day {assignedCourse.day}</p>
                  <Badge variant="outline" className="mt-2">
                    {assignedCourse.status === 'active' ? 'Active' : assignedCourse.status}
                  </Badge>
                </div>
                <Button variant="destructive" size="sm" onClick={handleRemoveCourse}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No course assigned yet</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAssignDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Assign a Course
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Course</DialogTitle>
            <DialogDescription>
              {assignedCourse ? 'Change' : 'Assign a new'} course for {learner.name}
            </DialogDescription>
          </DialogHeader>
          <CourseAssignment 
            learner={learner} 
            onAssigned={() => {
              setIsAssignDialogOpen(false);
              fetchAssignedCourse();
            }}
            onCancel={() => setIsAssignDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LearnerCourses;
