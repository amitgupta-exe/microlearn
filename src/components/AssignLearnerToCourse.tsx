import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, BookOpen, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { toast } from 'sonner';
import { Learner, CourseGroup } from '@/lib/types';
import CourseOverwriteDialog from './CourseOverwriteDialog';

interface AssignLearnerToCourseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learner: Learner | null;
  onAssignmentComplete?: () => void;
}

const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  
  return cleaned;
};

const AssignLearnerToCourse: React.FC<AssignLearnerToCourseProps> = ({
  open,
  onOpenChange,
  learner,
  onAssignmentComplete
}) => {
  const { user, userRole } = useMultiAuth();
  const [courses, setCourses] = useState<CourseGroup[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchCourses();
    }
  }, [open, user, userRole]);

  useEffect(() => {
    const filtered = courses.filter(course =>
      course.course_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCourses(filtered);
  }, [courses, searchQuery]);

  const fetchCourses = async () => {
    try {
      setIsLoadingCourses(true);
      
      let query = supabase
        .from('courses')
        .select('*');

      // if (userRole === 'admin') {
      //   query = query.eq('created_by', user?.id);
      // }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Group courses by course_name and count days
      const courseGroups: { [key: string]: CourseGroup } = {};
      
      (data || []).forEach(course => {
        const key = `${course.course_name}_${course.created_by}`;
        if (!courseGroups[key]) {
          courseGroups[key] = {
            id: course.id,
            course_name: course.course_name,
            created_at: course.created_at,
            updated_at: course.updated_at,
            created_by: course.created_by,
            status: course.status,
            visibility: course.visibility,
            origin: course.origin,
            total_days: 1
          };
        } else {
          courseGroups[key].total_days += 1;
          if (course.updated_at > courseGroups[key].updated_at) {
            courseGroups[key].updated_at = course.updated_at;
          }
        }
      });

      setCourses(Object.values(courseGroups));
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleAssignment = async () => {
    if (!selectedCourse || !learner) return;

    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(learner.phone);
      if (!normalizedPhone) {
        throw new Error('Invalid phone number');
      }

      // Check if learner already has an active course assignment
      const { data: existingActive, error: selectError } = await supabase
        .from('course_progress')
        .select('*, course_name')
        .eq('phone_number', normalizedPhone)
        .in('status', ['assigned', 'started']);

      if (selectError) throw selectError;

      if (existingActive && existingActive.length > 0) {
        setCurrentCourse(existingActive[0].course_name);
        setShowOverwriteDialog(true);
        return;
      }

      await performAssignment();
    } catch (error) {
      console.error('Error assigning course:', error);
      toast.error('Failed to assign course');
    } finally {
      setIsLoading(false);
    }
  };

  const performAssignment = async (isOverwrite = false) => {
    if (!selectedCourse || !learner) return;

    try {
      const normalizedPhone = normalizePhoneNumber(learner.phone);
      if (!normalizedPhone) {
        throw new Error('Invalid phone number');
      }

      if (isOverwrite) {
        await supabase
          .from('course_progress')
          .update({ status: 'suspended' })
          .eq('phone_number', normalizedPhone)
          .in('status', ['assigned', 'started']);
      }

      const { error: updateError } = await supabase
        .from('learners')
        .update({ 
          assigned_course_id: selectedCourse.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', learner.id);

      if (updateError) throw updateError;

      const { error: progressError } = await supabase
        .from('course_progress')
        .insert({
          learner_id: learner.id,
          course_id: selectedCourse.id,
          status: 'assigned',
          progress_percent: 0,
          current_day: 1,
          course_name: selectedCourse.course_name,
          learner_name: learner.name,
          phone_number: normalizedPhone,
          is_active: true,
          last_module_completed_at: new Date().toISOString()
        });

      if (progressError) throw progressError;

      toast.success(`Course "${selectedCourse.course_name}" assigned to ${learner.name} successfully`);
      
      setSelectedCourse(null);
      setSearchQuery('');
      onOpenChange(false);
      onAssignmentComplete?.();
    } catch (error) {
      console.error('Error in assignment:', error);
      toast.error('Failed to assign course');
      throw error;
    }
  };

  const handleOverwriteConfirm = async () => {
    await performAssignment(true);
    setShowOverwriteDialog(false);
    setCurrentCourse(null);
  };

  if (!learner) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Assign Course to {learner.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {isLoadingCourses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading courses...</span>
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No courses found matching your search.' : 'No courses available.'}
                </div>
              ) : (
                filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCourse?.id === course.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedCourse(course)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          <h3 className="font-medium">{course.course_name}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{course.total_days} days</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {course.origin === 'microlearn_manual' ? 'Manual' : 'Generated'}
                          </Badge>
                          <Badge variant={course.status === 'approved' ? 'default' : 'secondary'}>
                            {course.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedCourse && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Selected Course</h4>
                <p className="text-blue-800">{selectedCourse.course_name}</p>
                <p className="text-sm text-blue-600 mt-1">
                  {selectedCourse.total_days} days • {selectedCourse.status}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignment}
                disabled={!selectedCourse || isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Course
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Overwrite Confirmation Dialog */}
      <CourseOverwriteDialog
        open={showOverwriteDialog}
        onOpenChange={setShowOverwriteDialog}
        learner={learner}
        newCourse={{ id: selectedCourse?.id || '', course_name: selectedCourse?.course_name || '' } as any}
        onConfirm={handleOverwriteConfirm}
      />
    </>
  );
};

export default AssignLearnerToCourse;
