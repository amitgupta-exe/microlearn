
import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Learner, LearnerCourse, ExtendedLearnerCourse, Course } from '@/lib/types';
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
  const [learnerCourses, setLearnerCourses] = useState<ExtendedLearnerCourse[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  const fetchLearnerCourses = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('learner_courses')
        .select(`
          *,
          course:course_id (*)
        `)
        .eq('learner_id', learner.id);
        
      if (error) {
        console.error('Error fetching learner courses:', error);
        toast.error('Failed to load courses');
        return;
      }
      
      const transformedData: ExtendedLearnerCourse[] = data.map(item => ({
        id: item.id,
        learner_id: item.learner_id,
        course_id: item.course_id,
        start_date: item.start_date,
        completion_percentage: item.completion_percentage,
        status: item.status as 'scheduled' | 'in_progress' | 'completed',
        created_at: item.created_at,
        course: {
          id: item.course.id,
          name: item.course.name,
          description: item.course.description,
          category: item.course.category,
          language: item.course.language,
          status: item.course.status as 'active' | 'archived' | 'draft',
          created_at: item.course.created_at,
          visibility: item.course.visibility as 'public' | 'private',
          days: []
        }
      }));
      
      setLearnerCourses(transformedData);
    } catch (error) {
      console.error('Error in learner courses fetch:', error);
      toast.error('An error occurred while loading courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (learner && learner.id) {
      fetchLearnerCourses();
    }
  }, [learner]);
  
  const handleStatusUpdate = async (learnerCourseId: string, newStatus: 'scheduled' | 'in_progress' | 'completed') => {
    try {
      const completionPercentage = newStatus === 'completed' ? 100 : 
                                  newStatus === 'in_progress' ? 50 : 0;
      
      const { error } = await supabase
        .from('learner_courses')
        .update({ 
          status: newStatus,
          completion_percentage: completionPercentage,
          updated_at: new Date().toISOString()
        })
        .eq('id', learnerCourseId);
        
      if (error) {
        console.error('Error updating course status:', error);
        toast.error('Failed to update course status');
        return;
      }
      
      toast.success('Course status updated');
      
      setLearnerCourses(prev => 
        prev.map(lc => 
          lc.id === learnerCourseId 
            ? { ...lc, status: newStatus, completion_percentage: completionPercentage } 
            : lc
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };
  
  const handleRemoveCourse = async (learnerCourseId: string) => {
    try {
      const { error } = await supabase
        .from('learner_courses')
        .delete()
        .eq('id', learnerCourseId);
        
      if (error) {
        console.error('Error removing course:', error);
        toast.error('Failed to remove course');
        return;
      }
      
      toast.success('Course removed successfully');
      
      setLearnerCourses(prev => prev.filter(lc => lc.id !== learnerCourseId));
    } catch (error) {
      console.error('Error removing course:', error);
      toast.error('Failed to remove course');
    }
  };
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success' as const;
      case 'in_progress':
        return 'default' as const;
      case 'scheduled':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Assigned Courses</CardTitle>
            <CardDescription>
              Courses assigned to {learner.name}
            </CardDescription>
          </div>
          <Button onClick={() => setIsAssignDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Course
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading courses...</span>
            </div>
          ) : learnerCourses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No courses assigned yet</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAssignDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Assign a Course
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {learnerCourses.map((learnerCourse) => (
                    <TableRow key={learnerCourse.id}>
                      <TableCell className="font-medium">
                        {learnerCourse.course.name}
                      </TableCell>
                      <TableCell>
                        {new Date(learnerCourse.start_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(learnerCourse.status) as "default" | "secondary" | "destructive" | "outline" | "success"}>
                          {learnerCourse.status === 'in_progress' ? 'In Progress' : 
                           learnerCourse.status.charAt(0).toUpperCase() + learnerCourse.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={learnerCourse.completion_percentage} className="h-2" />
                          <span className="text-xs text-muted-foreground w-8">
                            {learnerCourse.completion_percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(learnerCourse.id, 'scheduled')}
                              disabled={learnerCourse.status === 'scheduled'}
                            >
                              Mark as Scheduled
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(learnerCourse.id, 'in_progress')}
                              disabled={learnerCourse.status === 'in_progress'}
                            >
                              Mark as In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(learnerCourse.id, 'completed')}
                              disabled={learnerCourse.status === 'completed'}
                            >
                              Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemoveCourse(learnerCourse.id)}
                            >
                              Remove Course
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Course</DialogTitle>
            <DialogDescription>
              Assign a new course to {learner.name}
            </DialogDescription>
          </DialogHeader>
          <CourseAssignment 
            learner={learner} 
            onAssigned={() => {
              setIsAssignDialogOpen(false);
              fetchLearnerCourses();
            }}
            onCancel={() => setIsAssignDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LearnerCourses;
