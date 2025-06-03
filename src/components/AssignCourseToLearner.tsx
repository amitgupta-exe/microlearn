import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Learner, Course } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: () => void;
}

const AssignCourseToLearner: React.FC<Props> = ({ course, open, onOpenChange, onAssigned }) => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearners, setSelectedLearners] = useState<Learner[]>([]);
  const [overwriteLearners, setOverwriteLearners] = useState<Learner[]>([]);
  const [showOverwrite, setShowOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from('learners').select('*').then(({ data }) =>
        setLearners(
          (data || []).map(l => ({
            ...l,
            status: l.status as 'active' | 'inactive',
          }))
        )
      );
      setSelectedLearners([]);
      setOverwriteLearners([]);
      setShowOverwrite(false);
    }
  }, [open]);

  const toggleLearner = (learner: Learner) => {
    setSelectedLearners(prev =>
      prev.some(l => l.id === learner.id)
        ? prev.filter(l => l.id !== learner.id)
        : [...prev, learner]
    );
  };

  const handleAssign = async () => {
    if (!course || selectedLearners.length === 0) return;
    // Find learners who already have a different course assigned
    const toOverwrite = selectedLearners.filter(
      l => l.assigned_course_id && l.assigned_course_id !== course.id
    );
    if (toOverwrite.length > 0) {
      setOverwriteLearners(toOverwrite);
      setShowOverwrite(true);
      return;
    }
    await assignToLearners(selectedLearners);
  };

  const assignToLearners = async (learnersToAssign: Learner[]) => {
    setLoading(true);
    try {
      for (const learner of learnersToAssign) {
        await supabase
          .from('learners')
          .update({ assigned_course_id: course!.id, updated_at: new Date().toISOString() })
          .eq('id', learner.id);
      }
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
    await assignToLearners(overwriteLearners);
  };

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl p-8'>
        <DialogHeader>
          <DialogTitle>Assign to Learner</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {learners.map(learner => (
            <Button
              key={learner.id}
              variant={selectedLearners.some(l => l.id === learner.id) ? 'secondary' : 'outline'}
              className="w-full py-4 px-6 mb-2 justify-start"
              onClick={() => toggleLearner(learner)}
            >
              <div className="flex flex-col  items-start">
                <span className="font-medium">{learner.name}</span>
                <span className="text-xs text-muted-foreground">{learner.email}</span>
                <span className="text-xs text-muted-foreground">{learner.phone}</span>
                {learner.assigned_course_id && (
                  <span className="text-xs text-warning">Already assigned a course</span>
                )}
              </div>
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={selectedLearners.length === 0 || loading}>
            Assign
          </Button>
        </div>
        {showOverwrite && (
          <div className="mt-4 p-4 border rounded bg-muted">
            <div className="mb-2">
              {overwriteLearners.length === 1
                ? `The selected learner already has a course assigned. Overwrite?`
                : `Some selected learners already have a course assigned. Overwrite for all?`}
            </div>
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

export default AssignCourseToLearner;