
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, Phone, BookOpen, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { toast } from 'sonner';
import { Course, Learner } from '@/lib/types';
import { normalizePhoneNumber } from '@/lib/utils';
import CourseOverwriteDialog from './CourseOverwriteDialog';

interface CourseAssignmentProps {
  course: Course;
  onAssignmentComplete?: () => void;
}

interface LearnerWithProgress extends Learner {
  progress?: {
    status: string;
    current_day: number;
    progress_percent: number;
    course_name: string;
  };
}

const CourseAssignment: React.FC<CourseAssignmentProps> = ({ course, onAssignmentComplete }) => {
  const { user, userRole } = useMultiAuth();
  const [learners, setLearners] = useState<LearnerWithProgress[]>([]);
  const [filteredLearners, setFilteredLearners] = useState<LearnerWithProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLearners, setIsLoadingLearners] = useState(true);
  const [overwriteDialogs, setOverwriteDialogs] = useState<{
    [key: string]: {
      open: boolean;
      learner: LearnerWithProgress;
      currentCourse: Course;
    }
  }>({});

  console.log('CourseAssignment - course:', course.course_name);

  useEffect(() => {
    fetchLearners();
  }, [user, userRole]);

  useEffect(() => {
    const filtered = learners.filter(learner =>
      learner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.phone.includes(searchQuery)
    );
    setFilteredLearners(filtered);
  }, [learners, searchQuery]);

  const fetchLearners = async () => {
    try {
      let query = supabase
        .from('learners')
        .select(`
          *,
          assigned_course:assigned_course_id(
            id,
            course_name
          )
        `);

      // Filter based on user role
      if (userRole === 'admin') {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch progress for each learner
      const learnersWithProgress: LearnerWithProgress[] = [];
      
      for (const learner of data || []) {
        const normalizedPhone = normalizePhoneNumber(learner.phone);
        
        // Get current progress
        const { data: progressData } = await supabase
          .from('course_progress')
          .select('status, current_day, progress_percent, course_name')
          .eq('phone_number', normalizedPhone)
          .in('status', ['assigned', 'started'])
          .order('created_at', { ascending: false })
          .limit(1);

        learnersWithProgress.push({
          ...learner,
          progress: progressData?.[0] || undefined
        });
      }

      console.log('Fetched learners for course assignment:', learnersWithProgress.length);
      setLearners(learnersWithProgress);
    } catch (error) {
      console.error('Error fetching learners:', error);
      toast.error('Failed to load learners');
    } finally {
      setIsLoadingLearners(false);
    }
  };

  const handleLearnerSelect = (learnerId: string) => {
    setSelectedLearners(prev => 
      prev.includes(learnerId) 
        ? prev.filter(id => id !== learnerId)
        : [...prev, learnerId]
    );
  };

  const handleBulkAssignment = async () => {
    if (selectedLearners.length === 0) return;

    setIsLoading(true);
    try {
      const conflictingLearners: LearnerWithProgress[] = [];
      const readyLearners: LearnerWithProgress[] = [];

      // Check for conflicts
      for (const learnerId of selectedLearners) {
        const learner = learners.find(l => l.id === learnerId);
        if (!learner) continue;

        if (learner.progress) {
          conflictingLearners.push(learner);
        } else {
          readyLearners.push(learner);
        }
      }

      // Assign to ready learners immediately
      for (const learner of readyLearners) {
        await performAssignment(learner, false);
      }

      // Show overwrite dialogs for conflicting learners
      const newOverwriteDialogs: typeof overwriteDialogs = {};
      conflictingLearners.forEach(learner => {
        newOverwriteDialogs[learner.id] = {
          open: true,
          learner,
          currentCourse: {
            id: learner.progress?.course_name || '',
            course_name: learner.progress?.course_name || 'Unknown Course'
          } as Course
        };
      });
      setOverwriteDialogs(newOverwriteDialogs);

      if (readyLearners.length > 0) {
        toast.success(`Successfully assigned course to ${readyLearners.length} learner(s)`);
      }

    } catch (error) {
      console.error('Error in bulk assignment:', error);
      toast.error('Failed to assign course');
    } finally {
      setIsLoading(false);
    }
  };

  const performAssignment = async (learner: LearnerWithProgress, isOverwrite: boolean) => {
    try {
      const normalizedPhone = normalizePhoneNumber(learner.phone);
      if (!normalizedPhone) {
        throw new Error('Invalid phone number');
      }

      // If overwriting, suspend the previous course progress
      if (isOverwrite) {
        await supabase
          .from('course_progress')
          .update({ status: 'suspended' })
          .eq('phone_number', normalizedPhone)
          .in('status', ['assigned', 'started']);
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

      await fetchLearners();
      onAssignmentComplete?.();
    } catch (error) {
      console.error('Error in assignment:', error);
      toast.error('Failed to assign course');
      throw error;
    }
  };

  const handleOverwriteConfirm = async (learnerId: string) => {
    const dialog = overwriteDialogs[learnerId];
    if (!dialog) return;

    try {
      await performAssignment(dialog.learner, true);
      toast.success(`Course assigned to ${dialog.learner.name} successfully`);
      
      // Close this dialog
      setOverwriteDialogs(prev => ({
        ...prev,
        [learnerId]: { ...prev[learnerId], open: false }
      }));
      
      // Remove from selected learners
      setSelectedLearners(prev => prev.filter(id => id !== learnerId));
    } catch (error) {
      console.error('Error confirming overwrite:', error);
    }
  };

  const handleOverwriteCancel = (learnerId: string) => {
    setOverwriteDialogs(prev => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], open: false }
    }));
    setSelectedLearners(prev => prev.filter(id => id !== learnerId));
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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search learners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Count */}
          {selectedLearners.length > 0 && (
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800">
                {selectedLearners.length} learner(s) selected
              </span>
              <Button
                size="sm"
                onClick={handleBulkAssignment}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign to Selected
              </Button>
            </div>
          )}

          {/* Learners List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLearners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No learners available for assignment.
              </div>
            ) : (
              filteredLearners.map((learner) => (
                <div
                  key={learner.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedLearners.includes(learner.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleLearnerSelect(learner.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{learner.name}</span>
                        <Badge variant={learner.status === 'active' ? 'default' : 'outline'}>
                          {learner.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{learner.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{learner.phone}</span>
                        </div>
                        {learner.progress && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <p className="font-medium text-yellow-800">Current Assignment:</p>
                            <p className="text-yellow-700">
                              {learner.progress.course_name} - Day {learner.progress.current_day} ({learner.progress.progress_percent}% complete)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedLearners.includes(learner.id)}
                      onChange={() => handleLearnerSelect(learner.id)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overwrite Dialogs */}
      {Object.entries(overwriteDialogs).map(([learnerId, dialog]) => (
        <CourseOverwriteDialog
          key={learnerId}
          open={dialog.open}
          onOpenChange={(open) => {
            if (!open) handleOverwriteCancel(learnerId);
          }}
          learner={dialog.learner}
          newCourse={course}
          onConfirm={() => handleOverwriteConfirm(learnerId)}
        />
      ))}
    </>
  );
};

export default CourseAssignment;
