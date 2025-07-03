
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
import { normalizePhoneNumber } from '@/lib/utils';
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
            {learner.name} already has an active course assignment. 
            Do you want to suspend their current progress and assign "{newCourse.course_name}"?
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Their current course progress will be suspended and they will receive a notification about the new assignment.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign New Course
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

  console.log('CourseAssignment - course:', course.course_name);

  useEffect(() => {
    fetchLearners();
  }, [user, userRole]);

  const fetchLearners = async () => {
    try {
      let query = supabase
        .from('learners')
        .select('*');

      // Filter based on user role
      if (userRole === 'admin') {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('Fetched learners for course assignment:', data?.length || 0);
      setLearners(data || []);
    } catch (error) {
      console.error('Error fetching learners:', error);
      toast.error('Failed to load learners');
    } finally {
      setIsLoadingLearners(false);
    }
  };

  const sendWhatsAppNotification = async (learner: Learner, course: Course, type: 'assignment' | 'suspension') => {
    console.log(`Sending ${type} WhatsApp notification to:`, learner.name);
    try {
      const notificationData = {
        learner_id: learner.id,
        learner_name: learner.name,
        learner_phone: learner.phone,
        course_id: course.id,
        course_name: course.course_name,
        type: type === 'assignment' ? 'course_assigned' : 'course_suspended'
      };

      const response = await fetch('/functions/v1/send-course-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZWhvY3JsbWt6ZHBlc3VxYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NTQyOTcsImV4cCI6MjA1NzQzMDI5N30.0h_DbjWlBv1lLAU9CT51wI5LpCKwvSZNTdN9efa57Zw'}`
        },
        body: JSON.stringify(notificationData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`${type} notification sent successfully:`, result);
    } catch (error) {
      console.error(`Error sending ${type} notification:`, error);
      // Don't throw - we don't want to fail the assignment if notification fails
    }
  };

  const handleAssignment = async () => {
    if (!selectedLearnerId || !course.id) return;

    setIsLoading(true);
    try {
      const selectedLearner = learners.find(l => l.id === selectedLearnerId);
      if (!selectedLearner) throw new Error('Learner not found');

      console.log('Assigning course to learner:', selectedLearner.name);

      const normalizedPhone = normalizePhoneNumber(selectedLearner.phone);
      if (!normalizedPhone) {
        throw new Error('Invalid phone number');
      }

      // Check if learner already has an active course assignment
      const { data: existingActive, error: selectError } = await supabase
        .from('course_progress')
        .select('*')
        .eq('phone_number', normalizedPhone)
        .in('status', ['assigned', 'started']);

      if (selectError) throw selectError;

      if (existingActive && existingActive.length > 0) {
        // Show overwrite dialog
        setOverwriteDialog({
          open: true,
          learner: selectedLearner,
          currentCourse: { 
            id: existingActive[0].course_id,
            course_name: existingActive[0].course_name 
          } as Course,
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
      const normalizedPhone = normalizePhoneNumber(learner.phone);
      if (!normalizedPhone) {
        throw new Error('Invalid phone number');
      }

      // If overwriting, suspend the previous course progress
      if (isOverwrite) {
        const { data: existingActive, error: selectError } = await supabase
          .from('course_progress')
          .select('*')
          .eq('phone_number', normalizedPhone)
          .in('status', ['assigned', 'started']);

        if (selectError) throw selectError;

        if (existingActive && existingActive.length > 0) {
          // Send suspension notifications first
          for (const existing of existingActive) {
            await sendWhatsAppNotification(
              learner,
              { id: existing.course_id, course_name: existing.course_name } as Course,
              'suspension'
            );
          }

          // Suspend existing progress
          await supabase
            .from('course_progress')
            .update({ status: 'suspended' })
            .eq('phone_number', normalizedPhone)
            .in('status', ['assigned', 'started']);
        }
      }

      // Update learner's assigned course
      const { error: updateError } = await supabase
        .from('learners')
        .update({ 
          assigned_course_id: course.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', learner.id);

      if (updateError) throw updateError;

      // Create course progress entry
      const { error: progressError } = await supabase
        .from('course_progress')
        .insert({
          learner_id: learner.id,
          course_id: course.id!,
          status: 'assigned',
          progress_percent: 0,
          current_day: 1,
          course_name: course.course_name,
          learner_name: learner.name,
          phone_number: normalizedPhone,
          is_active: true,
          last_module_completed_at: new Date().toISOString()
        });

      if (progressError) throw progressError;

      // Send WhatsApp assignment notification
      await sendWhatsAppNotification(learner, course, 'assignment');

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
                    {selectedLearner.assigned_course_id && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          Currently has an assigned course
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
