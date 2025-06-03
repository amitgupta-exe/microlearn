import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Course, Learner } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  learner: Learner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: () => void;
}

const AssignLearnerToCourse: React.FC<Props> = ({ learner, open, onOpenChange, onAssigned }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showOverwrite, setShowOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from('courses').select('*').then(({ data }) => setCourses(data || []));
    }
  }, [open]);

  const handleAssign = async () => {
    if (!selectedCourse || !learner) return;
    setLoading(true);
    try {
      if (learner.assigned_course_id && learner.assigned_course_id !== selectedCourse.id) {
        setShowOverwrite(true);
        setLoading(false);
        return;
      }
      await supabase
        .from('learners')
        .update({ assigned_course_id: selectedCourse.id, updated_at: new Date().toISOString() })
        .eq('id', learner.id);
      toast.success('Course assigned!');
      onOpenChange(false);
      onAssigned?.();
    } catch (e) {
      toast.error('Failed to assign course');
    } finally {
      setLoading(false);
    }
  };

  const handleOverwrite = async () => {
    setShowOverwrite(false);
    setLoading(true);
    try {
      await supabase
        .from('learners')
        .update({ assigned_course_id: selectedCourse!.id, updated_at: new Date().toISOString() })
        .eq('id', learner!.id);
      toast.success('Course overwritten!');
      onOpenChange(false);
      onAssigned?.();
    } catch (e) {
      toast.error('Failed to overwrite course');
    } finally {
      setLoading(false);
    }
  };

  if (!learner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a Course</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {courses.map(course => (
            <Button
              key={course.id}
              variant={selectedCourse?.id === course.id ? 'secondary' : 'outline'}
              className="w-full justify-start"
              onClick={() => setSelectedCourse(course)}
            >
              {course.course_name}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedCourse || loading}>
            Assign
          </Button>
        </div>
        {showOverwrite && (
          <div className="mt-4 p-4 border rounded bg-muted">
            <div className="mb-2">This learner already has a course assigned. Overwrite?</div>
            <div className="flex gap-2">
              <Button onClick={handleOverwrite} disabled={loading}>Yes, Overwrite</Button>
              <Button variant="outline" onClick={() => setShowOverwrite(false)} disabled={loading}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssignLearnerToCourse;