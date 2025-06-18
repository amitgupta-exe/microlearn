
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Learner, Course } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizePhoneNumber } from '@/lib/utils';

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

    const sendWhatsAppNotification = async (learner: Learner, course: Course) => {
        console.log('Sending WhatsApp notification to:', learner.name);
        try {
            const response = await fetch('/functions/v1/send-course-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZWhvY3JsbWt6ZHBlc3VxYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NTQyOTcsImV4cCI6MjA1NzQzMDI5N30.0h_DbjWlBv1lLAU9CT51wI5LpCKwvSZNTdN9efa57Zw'}`
                },
                body: JSON.stringify({
                    learner_id: learner.id,
                    learner_name: learner.name,
                    learner_phone: learner.phone,
                    course_id: course.id,
                    course_name: course.course_name,
                    type: 'course_assigned'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('WhatsApp notification sent successfully:', result);
        } catch (error) {
            console.error('Error sending WhatsApp notification:', error);
            // Don't throw - we don't want to fail the assignment if notification fails
        }
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

                console.log('Processing learner:', learner.name);

                const normalizedPhone = normalizePhoneNumber(learner.phone);
                if (!normalizedPhone) {
                    console.error('Invalid phone number for learner:', learner.name);
                    toast.error(`Invalid phone number for ${learner.name}`);
                    continue;
                }

                // Check for existing active progress (assigned or started status)
                const { data: existingActive, error: selectError } = await supabase
                    .from('course_progress')
                    .select('*')
                    .eq('phone_number', normalizedPhone)
                    .in('status', ['assigned', 'started']);

                if (selectError) {
                    console.error('Error checking existing progress:', selectError);
                    throw selectError;
                }

                // If there's existing active progress, suspend it
                if (existingActive && existingActive.length > 0) {
                    console.log('Found existing active progress, suspending:', existingActive);
                    
                    for (const existing of existingActive) {
                        // Send suspension notification
                        try {
                            await fetch('/functions/v1/send-course-notification', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyZWhvY3JsbWt6ZHBlc3VxYmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NTQyOTcsImV4cCI6MjA1NzQzMDI5N30.0h_DbjWlBv1lLAU9CT51wI5LpCKwvSZNTdN9efa57Zw'}`
                                },
                                body: JSON.stringify({
                                    learner_name: learner.name,
                                    learner_phone: learner.phone,
                                    course_name: existing.course_name,
                                    type: 'course_suspended'
                                })
                            });
                        } catch (notificationError) {
                            console.warn('Failed to send suspension notification:', notificationError);
                        }
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
                await sendWhatsAppNotification(learner, course);

                console.log('Successfully assigned course to:', learner.name);
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

    if (!course) return null;

    return (
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
    );
};

export default AssignCourseToLearner;
