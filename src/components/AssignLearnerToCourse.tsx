
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, BookOpen, Calendar } from 'lucide-react';
import { Learner, Course } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizePhoneNumber } from '@/lib/utils';
import { sendCourseAssignmentNotification, sendCourseSuspensionNotification } from '@/integrations/wati/functions';
import ConfirmDialog from './ConfirmDialog';

interface Props {
    learner: Learner;
    onSuccess: () => void;
    onCancel: () => void;
}

/**
 * Component for assigning a course to a specific learner
 * Features: course search, overwrite confirmation, WhatsApp notifications
 */
const AssignLearnerToCourse: React.FC<Props> = ({ learner, onSuccess, onCancel }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingCourses, setFetchingCourses] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        course?: Course;
        existingCourse?: string;
    }>({ open: false });

    console.log('AssignLearnerToCourse - learner:', learner);

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        // Filter courses based on search query
        const filtered = courses.filter(course =>
            course.course_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredCourses(filtered);
    }, [courses, searchQuery]);

    /**
     * Fetch available courses
     */
    const fetchCourses = async () => {
        console.log('Fetching courses for assignment...');
        setFetchingCourses(true);
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log('Fetched courses:', data?.length);
            setCourses(data || []);
            setFilteredCourses(data || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
            toast.error('Failed to load courses');
        } finally {
            setFetchingCourses(false);
        }
    };

    /**
     * Check for existing course progress
     */
    const checkExistingProgress = async (): Promise<string | null> => {
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

    /**
     * Handle course assignment
     */
    const handleAssignCourse = async (course: Course) => {
        // Check for existing active progress
        const existingCourseName = await checkExistingProgress();
        
        if (existingCourseName) {
            setConfirmDialog({
                open: true,
                course,
                existingCourse: existingCourseName
            });
            return;
        }

        await assignCourse(course);
    };

    /**
     * Assign course to learner
     */
    const assignCourse = async (course: Course) => {
        console.log('Assigning course to learner:', learner.name, 'course:', course.course_name);
        setLoading(true);

        const normalizedPhone = normalizePhoneNumber(learner.phone);
        if (!normalizedPhone) {
            console.error('Invalid phone number for learner:', learner.name);
            toast.error(`Invalid phone number for ${learner.name}`);
            setLoading(false);
            return;
        }

        try {
            // Check for existing active progress and suspend it
            const existingCourseName = await checkExistingProgress();
            
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

            toast.success(`Course "${course.course_name}" assigned to ${learner.name} successfully`);
            onSuccess();
        } catch (error: any) {
            console.error('Error assigning course:', error);
            toast.error(`Failed to assign course: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle overwrite confirmation
     */
    const handleConfirmOverwrite = () => {
        if (confirmDialog.course) {
            assignCourse(confirmDialog.course);
        }
    };

    return (
        <div className="space-y-6">
            {/* Learner Info */}
            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-900">Assigning Course To:</CardTitle>
                    <CardDescription className="text-blue-700">
                        {learner.name} • {learner.email} • {learner.phone}
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search courses..."
                    className="pl-8 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Courses List */}
            <div className="max-h-96 overflow-y-auto space-y-3">
                {fetchingCourses ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Loading courses...</span>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No courses match your search' : 'No approved courses available'}
                    </div>
                ) : (
                    filteredCourses.map(course => (
                        <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                            <BookOpen size={20} className="text-green-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg text-gray-900">
                                                {course.course_name}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                Day {course.day} • {course.visibility === 'public' ? 'Public' : 'Private'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge 
                                            variant="outline" 
                                            className="bg-green-50 text-green-700 border-green-200"
                                        >
                                            {course.status}
                                        </Badge>
                                        <Button
                                            onClick={() => handleAssignCourse(course)}
                                            disabled={loading}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {loading ? 'Assigning...' : 'Assign'}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    ))
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>

            {/* Confirm Dialog for Overwriting */}
            <ConfirmDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog({ open })}
                title="Overwrite Current Course?"
                description={`${learner.name} is currently enrolled in "${confirmDialog.existingCourse}". Assigning "${confirmDialog.course?.course_name}" will suspend their current progress. Continue?`}
                confirmText="Yes, Assign New Course"
                cancelText="Cancel"
                onConfirm={handleConfirmOverwrite}
                variant="destructive"
            />
        </div>
    );
};

export default AssignLearnerToCourse;
