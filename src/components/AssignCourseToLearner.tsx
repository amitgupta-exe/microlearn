
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Learner, Course } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizePhoneNumber } from '@/lib/utils';
import { sendCourseAssignmentNotification, sendCourseSuspensionNotification } from '@/integrations/wati/functions';
import ConfirmDialog from './ConfirmDialog';

interface Props {
    course: Course | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAssigned?: () => void;
}

const AssignCourseToLearner: React.FC<Props> = ({ course, open, onOpenChange, onAssigned }) => {
    const [learners, setLearners] = useState<Learner[]>([]);
    const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        learner?: Learner;
        existingCourse?: string;
    }>({ open: false });

    console.log('AssignCourseToLearner - course:', course, 'open:', open);

    useEffect(() => {
        if (open) {
            fetchLearners();
            setSelectedLearners([]);
        }
    }, [open]);

    const fetchLearners = async () => {
        console.log('Fetching learners for course assignment...');
        try {
            const { data, error } = await supabase
                .from('learners')
                .select('*')
                .order('name');

            if (error) throw error;

            console.log('Fetched learners:', data?.length || 0);
            setLearners(data || []);
        } catch (error) {
            console.error('Error fetching learners:', error);
            toast.error('Failed to load learners');
        }
    };

    const toggleLearner = (learnerId: string) => {
        console.log('Toggling learner:', learnerId);
        setSelectedLearners(prev =>
            prev.includes(learnerId)
                ? prev.filter(id => id !== learnerId)
                : [...prev, learnerId]
        );
    };

    const checkExistingProgress = async (learner: Learner): Promise<string | null> => {
        const normalizedPhone = normalizePhoneNumber(learner.phone);
        
        const { data: existingActive, error } = await supabase
            .from('course_progress')
            .select('*')
            .eq('phone_number', normalizedPhone)
            .in('status', ['assigned', 'started']);

        if (error) {
            console.error('Error checking existing progress:', error);
            return null;
        }

        if (existingActive && existingActive.length > 0) {
            return existingActive[0].course_name;
        }

        return null;
    };

    const handleAssign = async () => {
        if (!course || selectedLearners.length === 0) {
            toast.error('Please select at least one learner');
            return;
        }

        console.log('Assigning course to learners:', selectedLearners);
        setLoading(true);
        
        try {
            for (const learnerId of selectedLearners) {
                const learner = learners.find(l => l.id === learnerId);
                if (!learner) {
                    console.error('Learner not found:', learnerId);
                    continue;
                }

                await assignCourseToLearner(learner, course);
            }

            toast.success(`Course assigned to ${selectedLearners.length} learner(s) successfully`);
            onOpenChange(false);
            onAssigned?.();
        } catch (error: any) {
            console.error('Error assigning course:', error);
            toast.error(`Failed to assign course: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const assignCourseToLearner = async (learner: Learner, course: Course) => {
        console.log('Processing learner:', learner.name);

        const normalizedPhone = normalizePhoneNumber(learner.phone);
        if (!normalizedPhone) {
            console.error('Invalid phone number for learner:', learner.name);
            toast.error(`Invalid phone number for ${learner.name}`);
            return;
        }

        // Check for existing active progress
        const existingCourseName = await checkExistingProgress(learner);
        
        if (existingCourseName) {
            console.log('Found existing active progress, suspending:', existingCourseName);
            
            // Send suspension notification
            try {
                await sendCourseSuspensionNotification(learner.name, existingCourseName, normalizedPhone);
            } catch (notificationError) {
                console.warn('Failed to send suspension notification:', notificationError);
            }

            // Suspend existing active progress
            const { error: suspendError } = await supabase
                .from('course_progress')
                .update({ status: 'suspended' })
                .eq('phone_number', normalizedPhone)
                .in('status', ['assigned', 'started']);

            if (suspendError) {
                console.error('Error suspending existing progress:', suspendError);
                throw suspendError;
            }
        }

        // Update learner's assigned course
        const { error: updateLearnerError } = await supabase
            .from('learners')
            .update({ 
                assigned_course_id: course.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', learner.id);

        if (updateLearnerError) {
            console.error('Error updating learner:', updateLearnerError);
            throw updateLearnerError;
        }

        // Create new course progress entry
        const { error: insertError } = await supabase
            .from('course_progress')
            .insert({
                learner_id: learner.id,
                learner_name: learner.name,
                course_id: course.id,
                course_name: course.course_name,
                status: 'assigned',
                phone_number: normalizedPhone,
                current_day: 1,
                progress_percent: 0,
                last_module_completed_at: new Date().toISOString(),
                is_active: true
            });

        if (insertError) {
            console.error('Error creating course progress:', insertError);
            throw insertError;
        }

        // Send WhatsApp notification for new assignment
        try {
            await sendCourseAssignmentNotification(learner.name, course.course_name, normalizedPhone);
        } catch (notificationError) {
            console.warn('Failed to send assignment notification:', notificationError);
        }

        console.log('Successfully assigned course to:', learner.name);
    };

    if (!course) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl w-full p-6 bg-white rounded-lg shadow-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold mb-4">
                            Assign "{course.course_name}" to Learners
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="text-sm text-gray-600 mb-4">
                            Select multiple learners to assign this course to:
                        </div>
                        
                        <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-4">
                            {learners.map(learner => (
                                <div
                                    key={learner.id}
                                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                                >
                                    <Checkbox
                                        id={learner.id}
                                        checked={selectedLearners.includes(learner.id)}
                                        onCheckedChange={() => toggleLearner(learner.id)}
                                    />
                                    <label 
                                        htmlFor={learner.id}
                                        className="flex-1 cursor-pointer"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium">{learner.name}</span>
                                            <span className="text-sm text-gray-500">{learner.email}</span>
                                            <span className="text-sm text-gray-400">{learner.phone}</span>
                                            {learner.assigned_course_id && (
                                                <span className="text-xs text-yellow-600 mt-1">
                                                    Already has an assigned course
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>

                        {selectedLearners.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    {selectedLearners.length} learner(s) selected for assignment
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 mt-6">
                        <Button 
                            variant="outline" 
                            onClick={() => onOpenChange(false)} 
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssign}
                            disabled={selectedLearners.length === 0 || loading}
                        >
                            {loading ? 'Assigning...' : `Assign to ${selectedLearners.length} Learner(s)`}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog({ open })}
                title="Overwrite Course Progress?"
                description={`${confirmDialog.learner?.name} is already enrolled in "${confirmDialog.existingCourse}". This will suspend their current progress and assign the new course. Continue?`}
                confirmText="Yes, Assign New Course"
                cancelText="Cancel"
                onConfirm={() => {
                    if (confirmDialog.learner) {
                        assignCourseToLearner(confirmDialog.learner, course);
                    }
                }}
                variant="destructive"
            />
        </>
    );
};

export default AssignCourseToLearner;
