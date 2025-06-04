import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Course, Learner } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendInteractiveButtonsMessage } from '@/integrations/wati/functions';

interface Props {
    learner: Learner | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAssigned?: () => void;
}

function normalizePhone(phone: string): string {
    let p = phone.replace(/\s+/g, '').replace(/^\+/, '');
    if (p.length === 10) return '91' + p;
    if (p.length === 12 && p.startsWith('91')) return p;
    if (p.length === 13 && p.startsWith('91')) return p.slice(1); // e.g. '091xxxxxxxxxx'
    if (p.length === 14 && p.startsWith('91')) return p.slice(2); // e.g. '0091xxxxxxxxxx'
    throw new Error('Invalid phone number format');
}

const safeSendWhatsApp = async (phone: string, courseName: string, learnerName: string) => {
    const normalizedPhone = normalizePhone(phone);
    const title = `Start Learning`.slice(0, 20);
    const header = `Welcome to ${courseName}`.slice(0, 50);
    const body = `Hi ${learnerName}, you have been assigned a new course: ${courseName}. Click below to start learning!`;
    try {
        await sendInteractiveButtonsMessage(
            normalizedPhone,
            header,
            body,
            [{ title }],
            import.meta.env.VITE_WATI_API_KEY || ''
        );
    } catch (err: any) {
        throw new Error(
            'WhatsApp message failed: ' +
            (err?.message || JSON.stringify(err))
        );
    }
};

const sendSuspendedMessage = async (phone: string, prevCourseName: string, learnerName: string) => {
    const normalizedPhone = normalizePhone(phone);
    const title = `Course Suspended`.slice(0, 20);
    const header = `Course Suspended`.slice(0, 50);
    const body = `Hi ${learnerName}, your previous course (${prevCourseName}) has been suspended as you have been assigned a new course.`;
    try {
        await sendInteractiveButtonsMessage(
            normalizedPhone,
            header,
            body,
            [{ title }],
            import.meta.env.VITE_WATI_API_KEY || ''
        );
    } catch (err: any) {
        throw new Error(
            'Suspended WhatsApp message failed: ' +
            (err?.message || JSON.stringify(err))
        );
    }
};

const AssignLearnerToCourse: React.FC<Props> = ({ learner, open, onOpenChange, onAssigned }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [showOverwrite, setShowOverwrite] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            supabase.from('courses').select('*').then(({ data }) => setCourses(data || []));
            setSelectedCourse(null);
            setShowOverwrite(false);
        }
    }, [open]);

    // Check if learner already has an active progress for any course
    const checkOverwrite = async () => {
        if (!learner || !selectedCourse) return;
        setLoading(true);
        const { data: existingActive, error } = await supabase
            .from('course_progress')
            .select('id')
            .eq('phone_number', learner.phone)
            .in('status', ['assigned', 'started']);
        setLoading(false);
        if (error) {
            toast.error('Failed to check for existing progress: ' + error.message);
            return;
        }
        if (existingActive && existingActive.length > 0) {
            setShowOverwrite(true);
        } else {
            handleAssign();
        }
    };

    const handleAssign = async () => {
        if (!selectedCourse || !learner) return;
        setLoading(true);
        try {
            // 1. Check for existing active progress for this phone
            const { data: existingActive, error: selectError } = await supabase
                .from('course_progress')
                .select('*')
                .eq('phone_number', learner.phone)
                .in('status', ['assigned', 'started']);
            if (selectError) throw selectError;

            // 2. Suspend all active progress for this phone and send suspended message
            if (existingActive && existingActive.length > 0) {
                await supabase
                    .from('course_progress')
                    .update({ status: 'suspended' })
                    .eq('phone_number', learner.phone)
                    .in('status', ['assigned', 'started']);
                for (const prev of existingActive) {
                    await sendSuspendedMessage(learner.phone, prev.course_name, learner.name);
                }
            }

            // 3. Send WhatsApp message for new assignment
            if (!learner.phone) throw new Error('Learner phone number is missing');
            await safeSendWhatsApp(learner.phone, selectedCourse.course_name, learner.name);

            // 4. Update learner's assigned_course_id
            const { error: updateError } = await supabase
                .from('learners')
                .update({ assigned_course_id: selectedCourse.id, updated_at: new Date().toISOString() })
                .eq('id', learner.id);
            if (updateError) throw updateError;

            // 5. Insert new assigned progress row
            const { error: insertError } = await supabase.from('course_progress').insert({
                learner_id: learner.id,
                learner_name: learner.name,
                course_id: selectedCourse.id,
                course_name: selectedCourse.course_name,
                status: 'assigned',
                phone_number: learner.phone,
                current_day: 1,
                last_module_completed_at: new Date().toISOString()
            });
            if (insertError) throw insertError;

            toast.success('Course assigned!');
            onOpenChange(false);
            onAssigned?.();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to assign course');
        } finally {
            setLoading(false);
        }
    };

    const handleOverwrite = async () => {
        setShowOverwrite(false);
        setLoading(true);
        try {
            // 1. Suspend all active progress for this phone and send suspended message
            const { data: existingActive, error: selectError } = await supabase
                .from('course_progress')
                .select('*')
                .eq('phone_number', learner!.phone)
                .in('status', ['assigned', 'started']);
            if (selectError) throw selectError;

            if (existingActive && existingActive.length > 0) {
                await supabase
                    .from('course_progress')
                    .update({ status: 'suspended' })
                    .eq('phone_number', learner!.phone)
                    .in('status', ['assigned', 'started']);
                for (const prev of existingActive) {
                    await sendSuspendedMessage(learner!.phone, prev.course_name, learner!.name);
                }
            }

            // 2. Send WhatsApp message for new assignment
            if (!learner?.phone || !selectedCourse) throw new Error('Missing learner or course');
            await safeSendWhatsApp(learner.phone, selectedCourse.course_name, learner.name);

            // 3. Update learner's assigned_course_id
            const { error: updateError } = await supabase
                .from('learners')
                .update({ assigned_course_id: selectedCourse.id, updated_at: new Date().toISOString() })
                .eq('id', learner.id);
            if (updateError) throw updateError;

            // 4. Insert new assigned progress row
            const { error: insertError } = await supabase.from('course_progress').insert({
                learner_id: learner.id,
                learner_name: learner.name,
                course_id: selectedCourse.id,
                course_name: selectedCourse.course_name,
                status: 'assigned',
                phone_number: learner.phone,
                current_day: 1,
                last_module_completed_at: new Date().toISOString()
            });
            if (insertError) throw insertError;

            toast.success('Course overwritten!');
            onOpenChange(false);
            onAssigned?.();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to overwrite course');
        } finally {
            setLoading(false);
        }
    };

    if (!learner) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl w-full p-10 bg-white rounded-lg shadow-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold mb-4">Assign a Course</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                    {courses.map(course => (
                        <Button
                            key={course.id}
                            variant={selectedCourse?.id === course.id ? 'secondary' : 'outline'}
                            className="w-full justify-start py-4 px-6 mb-2 rounded border border-gray-200 bg-white hover:bg-blue-50 text-gray-900"
                            onClick={() => setSelectedCourse(course)}
                        >
                            {course.course_name}
                        </Button>
                    ))}
                </div>
                <div className="flex gap-2 mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={checkOverwrite} disabled={!selectedCourse || loading}>
                        Assign
                    </Button>
                </div>
                {showOverwrite && (
                    <div className="mt-4 p-4 border rounded bg-gray-50">
                        <div className="mb-2 text-gray-700">
                            This learner already has an active course. Overwrite?
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

export default AssignLearnerToCourse;