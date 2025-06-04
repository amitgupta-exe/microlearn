import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Learner, Course } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendWhatsAppMessage, sendInteractiveButtonsMessage } from '@/integrations/wati/functions';
import { normalizePhoneNumber } from '@/lib/utils'
interface Props {
    course: Course | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAssigned?: () => void;
}


const safeSendWhatsApp = async (phone: string, courseName: string, learnerName: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
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
    const normalizedPhone = normalizePhoneNumber(phone);
    const title = `Course Suspended`.slice(0, 20);
    const header = `Course Suspended`.slice(0, 50);
    const body = `Hi ${learnerName}, your previous course (${prevCourseName}) has been suspended as you have been assigned a new course.`;
    try {
        await sendWhatsAppMessage(
            normalizedPhone,
            `${header}\n\n${body}`,
            import.meta.env.VITE_WATI_API_KEY || ''
        );
    } catch (err: any) {
        throw new Error(
            'Suspended WhatsApp message failed: ' +
            (err?.message || JSON.stringify(err))
        );
    }
};

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
                    (data || []).map((l: any) => ({
                        ...l,
                        status: l.status === 'active' ? 'active' : 'inactive'
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

    // Check if any selected learner already has an active progress for this course
    const checkOverwrite = async () => {
        setLoading(true);
        const overwrite: Learner[] = [];
        for (const learner of selectedLearners) {
            const { data: existingActive } = await supabase
                .from('course_progress')
                .select('id')
                .eq('phone_number', learner.phone)
                .in('status', ['assigned', 'started']);
            if (existingActive && existingActive.length > 0) {
                overwrite.push(learner);
            }
        }
        setLoading(false);
        if (overwrite.length > 0) {
            setOverwriteLearners(overwrite);
            setShowOverwrite(true);
        } else {
            handleAssign();
        }
    };

    const handleAssign = async () => {
        if (!course || selectedLearners.length === 0) return;
        setLoading(true);
        try {
            for (const learner of selectedLearners) {
                if (!learner.phone) throw new Error(`Learner ${learner.name} phone number is missing`);

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
                await safeSendWhatsApp(learner.phone, course.course_name, learner.name);

                // 4. Update learner's assigned_course_id
                const { error: updateError } = await supabase
                    .from('learners')
                    .update({ assigned_course_id: course.id, updated_at: new Date().toISOString() })
                    .eq('id', learner.id);
                if (updateError) throw updateError;

                // 5. Insert new assigned progress row
                const number = normalizePhoneNumber(learner.phone)
                const { error: insertError } = await supabase
                    .from('course_progress')
                    .insert({
                        learner_id: learner.id,
                        learner_name: learner.name,
                        course_id: course.id,
                        course_name: course.course_name,
                        status: 'assigned',
                        phone_number: number || null,
                        current_day: 1,
                        last_module_completed_at: new Date().toISOString()
                    });
                if (insertError) throw insertError;
            }
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
            for (const learner of overwriteLearners) {
                if (!learner.phone) throw new Error(`Learner ${learner.name} phone number is missing`);

                // 1. Suspend all active progress for this phone and send suspended message
                const { data: existingActive, error: selectError } = await supabase
                    .from('course_progress')
                    .select('*')
                    .eq('phone_number', learner.phone)
                    .in('status', ['assigned', 'started']);
                if (selectError) throw selectError;

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

                // 2. Send WhatsApp message for new assignment
                await safeSendWhatsApp(learner.phone, course!.course_name, learner.name);

                // 3. Update learner's assigned_course_id
                const { error: updateError } = await supabase
                    .from('learners')
                    .update({ assigned_course_id: course!.id, updated_at: new Date().toISOString() })
                    .eq('id', learner.id);
                if (updateError) throw updateError;

                // 4. Insert new assigned progress row
                const number = normalizePhoneNumber(learner.phone)

                const { error: insertError } = await supabase
                    .from('course_progress')
                    .insert({
                        learner_id: learner.id,
                        learner_name: learner.name,
                        course_id: course!.id,
                        course_name: course!.course_name,
                        status: 'assigned',
                        phone_number: number || null,
                        current_day: 1,
                        last_module_completed_at: new Date().toISOString()
                    });
                if (insertError) throw insertError;
            }
            toast.success('Course assigned!');
            onOpenChange(false);
            onAssigned?.();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to overwrite course');
        } finally {
            setLoading(false);
        }
    };

    if (!course) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl w-full p-10 bg-white rounded-lg shadow-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold mb-4">Assign to Learner</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                    {learners.map(learner => (
                        <Button
                            key={learner.id}
                            variant={selectedLearners.some(l => l.id === learner.id) ? 'secondary' : 'outline'}
                            className="w-full py-4 px-6 mb-2 justify-start rounded border border-gray-200 bg-white hover:bg-blue-50 text-gray-900"
                            onClick={() => toggleLearner(learner)}
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{learner.name}</span>
                                <span className="text-xs text-gray-500">{learner.email}</span>
                                <span className="text-xs text-gray-400">{learner.phone}</span>
                                {learner.assigned_course_id && (
                                    <span className="text-xs text-yellow-600">Already assigned a course</span>
                                )}
                            </div>
                        </Button>
                    ))}
                </div>
                <div className="flex gap-2 mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={checkOverwrite}
                        disabled={selectedLearners.length === 0 || loading}
                    >
                        Assign
                    </Button>
                </div>
                {showOverwrite && (
                    <div className="mt-4 p-4 border rounded bg-gray-50">
                        <div className="mb-2 text-gray-700">
                            {overwriteLearners.length === 1
                                ? `The selected learner already has an active course. Overwrite?`
                                : `Some selected learners already have an active course. Overwrite for all?`}
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
