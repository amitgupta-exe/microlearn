import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, User } from 'lucide-react';
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

/**
 * Enhanced component for assigning a course to multiple learners
 * Features: search functionality, overwrite confirmation, WhatsApp notifications
 * Buttons placed outside scrollable section for better UX
 */
const AssignCourseToLearner: React.FC<Props> = ({ course, open, onOpenChange, onAssigned }) => {
    const [learners, setLearners] = useState<Learner[]>([]);
    const [filteredLearners, setFilteredLearners] = useState<Learner[]>([]);
    const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingLearners, setFetchingLearners] = useState(false);

    // Overwrite dialog state
    const [overwriteDialog, setOverwriteDialog] = useState<{
        open: boolean;
        learner?: Learner;
        existingCourse?: string;
    }>({ open: false });

    // Track which learners need overwrite confirmation
    const [pendingAssignments, setPendingAssignments] = useState<{ learner: Learner; }[]>([]);

    useEffect(() => {
        if (open) {
            fetchLearners();
            setSelectedLearners([]);
            setSearchQuery('');
        }
    }, [open]);

    useEffect(() => {
        // Filter learners based on search query
        const filtered = learners.filter(learner =>
            learner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            learner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            learner.phone.includes(searchQuery)
        );
        setFilteredLearners(filtered);
    }, [learners, searchQuery]);

    /**
     * Fetch learners with their course assignment status
     */
    const fetchLearners = async () => {
        setFetchingLearners(true);
        try {
            const { data, error } = await supabase
                .from('learners')
                .select('*')
                .order('name');

            if (error) throw error;

            // Check for active course progress for each learner
            const learnersWithStatus = await Promise.all(
                (data || []).map(async (learner) => {
                    const { data: progressData } = await supabase
                        .from('course_progress')
                        .select('course_name, status')
                        .eq('phone_number', learner.phone)
                        .in('status', ['assigned', 'started'])
                        .limit(1);

                    return {
                        ...learner,
                        hasActiveCourse: progressData && progressData.length > 0,
                        activeCourse: progressData?.[0]?.course_name || null,
                        status: learner.status as 'active' | 'inactive'
                    };
                })
            );

            setLearners(learnersWithStatus);
            setFilteredLearners(learnersWithStatus);
        } catch (error) {
            toast.error('Failed to load learners');
        } finally {
            setFetchingLearners(false);
        }
    };

    /**
     * Toggle learner selection
     */
    const toggleLearner = (learnerId: string) => {
        setSelectedLearners(prev =>
            prev.includes(learnerId)
                ? prev.filter(id => id !== learnerId)
                : [...prev, learnerId]
        );
    };

    /**
     * Check for existing course progress
     */
    const checkExistingProgress = async (learner: Learner): Promise<string | null> => {
        const normalizedPhone = normalizePhoneNumber(learner.phone);

        const { data: existingActive, error } = await supabase
            .from('course_progress')
            .select('*')
            .eq('phone_number', normalizedPhone)
            .in('status', ['assigned', 'started']);

        if (error) {
            return null;
        }

        if (existingActive && existingActive.length > 0) {
            return existingActive[0].course_name;
        }

        return null;
    };

    /**
     * Assign course to a single learner, with overwrite logic
     */
    const assignCourseToLearner = async (learner: Learner, course: Course, overwrite = false) => {
        const normalizedPhone = normalizePhoneNumber(learner.phone);
        if (!normalizedPhone) {
            toast.error(`Invalid phone number for ${learner.name}`);
            return;
        }

        // If overwrite, suspend existing progress
        if (overwrite) {
            try {
                await sendCourseSuspensionNotification(learner.name, learner.activeCourse, normalizedPhone);
            } catch {}
            await supabase
                .from('course_progress')
                .update({ status: 'suspended' })
                .eq('phone_number', normalizedPhone)
                .in('status', ['assigned', 'started']);
        }

        // Update learner's assigned course
        await supabase
            .from('learners')
            .update({
                assigned_course_id: course.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', learner.id);

        // Create new course progress entry
        await supabase
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

        try {
            await sendCourseAssignmentNotification(learner.name, course.course_name, normalizedPhone);
        } catch {}
    };

    /**
     * Handle course assignment to selected learners, with overwrite dialog
     */
    const handleAssign = async () => {
        if (!course || selectedLearners.length === 0) {
            toast.error('Please select at least one learner');
            return;
        }

        setLoading(true);

        // Check for learners that need overwrite confirmation
        const learnersToAssign = selectedLearners.map(id => learners.find(l => l.id === id)).filter(Boolean) as Learner[];
        const overwriteNeeded: { learner: Learner; existingCourse: string }[] = [];

        for (const learner of learnersToAssign) {
            if (learner.hasActiveCourse) {
                overwriteNeeded.push({ learner, existingCourse: learner.activeCourse });
            }
        }

        if (overwriteNeeded.length > 0) {
            // Show overwrite dialog for the first learner needing overwrite
            setOverwriteDialog({
                open: true,
                learner: overwriteNeeded[0].learner,
                existingCourse: overwriteNeeded[0].existingCourse
            });
            setPendingAssignments(overwriteNeeded);
            setLoading(false);
            return;
        }

        // No overwrite needed, assign directly
        try {
            for (const learner of learnersToAssign) {
                await assignCourseToLearner(learner, course);
            }
            toast.success(`Course assigned to ${learnersToAssign.length} learner(s) successfully`);
            onOpenChange(false);
            onAssigned?.();
        } catch (error: any) {
            toast.error(`Failed to assign course: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Handle confirm overwrite for all pending assignments
    const handleOverwriteConfirm = async () => {
        setLoading(true);
        try {
            for (const { learner } of pendingAssignments) {
                await assignCourseToLearner(learner, course!, true);
            }
            toast.success(`Course assigned (with overwrite) to ${pendingAssignments.length} learner(s)`);
            setOverwriteDialog({ open: false });
            setPendingAssignments([]);
            onOpenChange(false);
            onAssigned?.();
        } catch (error: any) {
            toast.error(`Failed to assign course: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!course) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col bg-white">
                    {/* Header - Fixed */}
                    <DialogHeader className="flex-shrink-0 border-b pb-4">
                        <DialogTitle className="text-xl font-semibold text-gray-900">
                            Assign "{course.course_name}" to Learners
                        </DialogTitle>
                    </DialogHeader>
                    
                    {/* Search Bar - Fixed */}
                    <div className="flex-shrink-0 p-4 bg-gray-50 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search learners by name, email, or phone..."
                                className="pl-8 bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {selectedLearners.length > 0 && (
                            <div className="mt-2 text-sm text-blue-600">
                                {selectedLearners.length} learner(s) selected for assignment
                            </div>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {fetchingLearners ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                <span className="ml-2 text-gray-600">Loading learners...</span>
                            </div>
                        ) : filteredLearners.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {searchQuery ? 'No learners match your search' : 'No learners found'}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredLearners.map(learner => (
                                    <div
                                        key={learner.id}
                                        className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 ${
                                            selectedLearners.includes(learner.id) ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                                        }`}
                                    >
                                        <Checkbox
                                            id={learner.id}
                                            checked={selectedLearners.includes(learner.id)}
                                            onCheckedChange={() => toggleLearner(learner.id)}
                                        />
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <User size={14} />
                                        </div>
                                        <label 
                                            htmlFor={learner.id}
                                            className="flex-1 cursor-pointer"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{learner.name}</span>
                                                <span className="text-sm text-gray-600">{learner.email}</span>
                                                <span className="text-sm text-gray-400">{learner.phone}</span>
                                                {learner.hasActiveCourse && (
                                                    <span className="text-xs text-yellow-600 mt-1">
                                                        Currently enrolled in: {learner.activeCourse}
                                                    </span>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons - Fixed at bottom, outside scroll area */}
                    <DialogFooter className="flex-shrink-0 flex gap-2 p-4 border-t bg-white">
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
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                `Assign to ${selectedLearners.length} Learner(s)`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Overwrite Confirmation Dialog */}
            <ConfirmDialog
                open={overwriteDialog.open}
                onOpenChange={(open) => setOverwriteDialog({ ...overwriteDialog, open })}
                title="Overwrite Course Progress?"
                description={
                    overwriteDialog.learner
                        ? `${overwriteDialog.learner.name} is already enrolled in "${overwriteDialog.existingCourse}". This will suspend their current progress and assign the new course. Continue?`
                        : ''
                }
                confirmText="Yes, Assign New Course"
                cancelText="Cancel"
                onConfirm={handleOverwriteConfirm}
                variant="destructive"
            />
        </>
    );
};

export default AssignCourseToLearner;
