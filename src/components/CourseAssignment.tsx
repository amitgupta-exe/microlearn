
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, Phone, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { toast } from 'sonner';
import { Course, Learner } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CourseAssignmentProps {
  course: Course;
  onAssignmentComplete?: () => void;
}

interface CourseOverwriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learner: Learner;
  currentCourse: Course;
  newCourse: Course;
  onConfirm: () => Promise<void>;
}

const CourseOverwriteDialog: React.FC<CourseOverwriteDialogProps> = ({
  open,
  onOpenChange,
  learner,
  currentCourse,
  newCourse,
  onConfirm,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming overwrite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Course Assignment Conflict</DialogTitle>
          <DialogDescription>
            {learner.name} is already assigned to "{currentCourse.course_name}". 
            Do you want to reassign them to "{newCourse.course_name}"?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reassign Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CourseAssignment: React.FC<CourseAssignmentProps> = ({ course, onAssignmentComplete }) => {
  const { user, userRole } = useMultiAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLearners, setIsLoadingLearners] = useState(true);
  const [overwriteDialog, setOverwriteDialog] = useState<{
    open: boolean;
    learner?: Learner;
    currentCourse?: Course;
  }>({ open: false });

  useEffect(() => {
    fetchLearners();
  }, [user, userRole]);

  const fetchLearners = async () => {
    try {
      let query = supabase
        .from('learners')
        .select(`
          *,
          assigned_course:courses!learners_assigned_course_id_fkey (*)
        `);

      // Filter based on user role
      if (userRole === 'admin') {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLearners(data || []);
    } catch (error) {
      console.error('Error fetching learners:', error);
      toast.error('Failed to load learners');
    } finally {
      setIsLoadingLearners(false);
    }
  };

  const handleAssignment = async () => {
    if (!selectedLearnerId || !course.id) return;

    setIsLoading(true);
    try {
      const selectedLearner = learners.find(l => l.id === selectedLearnerId);
      if (!selectedLearner) throw new Error('Learner not found');

      // Check if learner already has an assigned course
      if (selectedLearner.assigned_course_id && selectedLearner.assigned_course) {
        setOverwriteDialog({
          open: true,
          learner: selectedLearner,
          currentCourse: selectedLearner.assigned_course,
        });
        return;
      }

      await performAssignment(selectedLearner);
    } catch (error) {
      console.error('Error assigning course:', error);
      toast.error('Failed to assign course');
    } finally {
      setIsLoading(false);
    }
  };

  const performAssignment = async (learner: Learner, isOverwrite = false) => {
    try {
      // If overwriting, suspend the previous course progress
      if (isOverwrite && learner.assigned_course_id) {
        await supabase
          .from('course_progress')
          .update({ status: 'suspended' })
          .eq('learner_id', learner.id)
          .eq('course_id', learner.assigned_course_id);
      }

      // Update learner's assigned course
      const { error: updateError } = await supabase
        .from('learners')
        .update({ assigned_course_id: course.id })
        .eq('id', learner.id);

      if (updateError) throw updateError;

      // Create course progress entry
      const { error: progressError } = await supabase
        .from('course_progress')
        .insert({
          learner_id: learner.id,
          course_id: course.id!,
          status: 'not_started',
          progress_percent: 0,
          current_day: 1,
          course_name: course.course_name,
          learner_name: learner.name,
          phone_number: learner.phone,
        });

      if (progressError) throw progressError;

      // Record message sent
      const { error: messageError } = await supabase
        .from('messages_sent')
        .insert({
          user_id: user?.id!,
          learner_id: learner.id,
          message_type: 'course_assignment',
        });

      if (messageError) throw messageError;

      // Send WhatsApp message (placeholder - implement your WhatsApp API call here)
      try {
        const response = await fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: learner.phone,
            message: `You have been assigned to course: ${course.course_name}`,
            learner_name: learner.name,
            course_name: course.course_name,
          }),
        });
        console.log('WhatsApp message sent:', response.status);
      } catch (whatsappError) {
        console.warn('WhatsApp message failed:', whatsappError);
      }

      toast.success(`Course assigned to ${learner.name} successfully`);
      setSelectedLearnerId('');
      await fetchLearners();
      onAssignmentComplete?.();
    } catch (error) {
      console.error('Error in assignment:', error);
      toast.error('Failed to assign course');
      throw error;
    }
  };

  const handleOverwriteConfirm = async () => {
    if (!overwriteDialog.learner) return;
    await performAssignment(overwriteDialog.learner, true);
    setOverwriteDialog({ open: false });
  };

  if (isLoadingLearners) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading learners...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Assign Course: {course.course_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Learner</label>
            <Select value={selectedLearnerId} onValueChange={setSelectedLearnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a learner..." />
              </SelectTrigger>
              <SelectContent>
                {learners.map((learner) => (
                  <SelectItem key={learner.id} value={learner.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{learner.name}</span>
                      {learner.assigned_course_id && (
                        <Badge variant="secondary" className="ml-2">
                          Has Course
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLearnerId && (
            <div className="border rounded-lg p-4 bg-muted/50">
              {(() => {
                const selectedLearner = learners.find(l => l.id === selectedLearnerId);
                return selectedLearner ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{selectedLearner.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{selectedLearner.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{selectedLearner.phone}</span>
                    </div>
                    {selectedLearner.assigned_course && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          Currently assigned to: <strong>{selectedLearner.assigned_course.course_name}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <Button 
            onClick={handleAssignment} 
            disabled={!selectedLearnerId || isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Course
          </Button>
        </CardContent>
      </Card>

      {overwriteDialog.learner && overwriteDialog.currentCourse && (
        <CourseOverwriteDialog
          open={overwriteDialog.open}
          onOpenChange={(open) => setOverwriteDialog({ ...overwriteDialog, open })}
          learner={overwriteDialog.learner}
          currentCourse={overwriteDialog.currentCourse}
          newCourse={course}
          onConfirm={handleOverwriteConfirm}
        />
      )}
    </>
  );
};

export default CourseAssignment;
