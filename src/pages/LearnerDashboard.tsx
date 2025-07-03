
import React, { useState, useEffect } from 'react';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Pause, 
  Search, 
  LogOut, 
  GraduationCap,
  User
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import ConfirmDialog from '@/components/ConfirmDialog';
import { sendCourseAssignmentNotification, sendCourseSuspensionNotification } from '@/integrations/wati/functions';
import { normalizePhoneNumber } from '@/lib/utils';

type CourseProgress = Tables<'course_progress'>;
type Course = Tables<'courses'>;

interface CourseWithProgress extends Course {
  progress?: CourseProgress;
}

/**
 * Learner Dashboard - View assigned courses and explore public courses
 * Features: self-assignment, overwrite protection, course exploration
 */
const LearnerDashboard: React.FC = () => {
  const { user, signOut } = useMultiAuth();
  const [myCourses, setMyCourses] = useState<CourseProgress[]>([]);
  const [publicCourses, setPublicCourses] = useState<CourseWithProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigningCourse, setAssigningCourse] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    course?: Course;
    hasAdminAssigned?: boolean;
  }>({ open: false });

  console.log('LearnerDashboard - user:', user);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  /**
   * Fetch learner's courses and available public courses
   */
  const fetchData = async () => {
    if (!user?.phone) return;

    setLoading(true);
    try {
      // Fetch learner's course progress
      const { data: progressData, error: progressError } = await supabase
        .from('course_progress')
        .select('*')
        .eq('phone_number', normalizePhoneNumber(user.phone))
        .order('created_at', { ascending: false });

      if (progressError) {
        console.error('Error fetching progress:', progressError);
      } else {
        setMyCourses(progressData || []);
      }

      // Fetch public courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
      } else {
        // Add progress info to public courses
        const coursesWithProgress = (coursesData || []).map(course => {
          const progress = progressData?.find(p => p.course_id === course.id);
          return { ...course, progress };
        });
        setPublicCourses(coursesWithProgress);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if learner can assign/overwrite a course
   */
  const canAssignCourse = async (courseId: string): Promise<{ canAssign: boolean; hasAdminAssigned: boolean }> => {
    if (!user?.phone) return { canAssign: false, hasAdminAssigned: false };

    // Check for existing active course progress
    const { data: existingProgress } = await supabase
      .from('course_progress')
      .select('*, learners(*)')
      .eq('phone_number', normalizePhoneNumber(user.phone))
      .in('status', ['assigned', 'started'])
      .single();

    if (!existingProgress) {
      return { canAssign: true, hasAdminAssigned: false };
    }

    // Check if the existing course was assigned by an admin
    const { data: learnerData } = await supabase
      .from('learners')
      .select('created_by, users(*)')
      .eq('phone', user.phone)
      .single();

    if (learnerData?.created_by) {
      // Course was assigned by an admin - cannot overwrite
      return { canAssign: false, hasAdminAssigned: true };
    }

    // Self-assigned course - can overwrite
    return { canAssign: true, hasAdminAssigned: false };
  };

  /**
   * Handle course self-assignment
   */
  const handleSelfAssign = async (course: Course) => {
    if (!user?.phone) return;

    const { canAssign, hasAdminAssigned } = await canAssignCourse(course.id);

    if (!canAssign && hasAdminAssigned) {
      toast({
        title: 'Cannot Assign Course',
        description: 'You have an active course assigned by an admin. Please complete it first.',
        variant: 'destructive',
      });
      return;
    }

    if (!canAssign) {
      setConfirmDialog({
        open: true,
        course,
        hasAdminAssigned
      });
      return;
    }

    await assignCourse(course);
  };

  /**
   * Assign course to learner
   */
  const assignCourse = async (course: Course) => {
    if (!user?.phone) return;

    setAssigningCourse(course.id);
    const normalizedPhone = normalizePhoneNumber(user.phone);

    try {
      // Check for existing active progress and suspend it
      const { data: existingActive } = await supabase
        .from('course_progress')
        .select('*')
        .eq('phone_number', normalizedPhone)
        .in('status', ['assigned', 'started']);

      if (existingActive && existingActive.length > 0) {
        console.log('Found existing active progress, suspending...');
        
        // Send suspension notification
        for (const existing of existingActive) {
          try {
            await sendCourseSuspensionNotification(user.name, existing.course_name || 'Unknown Course', normalizedPhone);
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

      // Create new course progress entry
      const { error: insertError } = await supabase
        .from('course_progress')
        .insert({
          learner_id: user.id,
          learner_name: user.name,
          course_id: course.id,
          course_name: course.course_name,
          status: 'assigned',
          phone_number: normalizedPhone,
          current_day: 1,
          progress_percent: 0,
          is_active: true
        });

      if (insertError) {
        console.error('Error creating course progress:', insertError);
        throw insertError;
      }

      // Send WhatsApp notification for new assignment
      try {
        await sendCourseAssignmentNotification(user.name, course.course_name, normalizedPhone);
      } catch (notificationError) {
        console.warn('Failed to send assignment notification:', notificationError);
      }

      toast({
        title: 'Course Assigned!',
        description: `You have been enrolled in "${course.course_name}". You'll receive course content via WhatsApp.`,
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error assigning course:', error);
      toast({
        title: 'Assignment Failed',
        description: `Failed to assign course: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setAssigningCourse(null);
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    await signOut();
  };

  /**
   * Get status badge for course progress
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge className="bg-blue-100 text-blue-800">Assigned</Badge>;
      case 'started':
        return <Badge className="bg-green-100 text-green-800">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-purple-100 text-purple-800">Completed</Badge>;
      case 'suspended':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter public courses based on search
  const filteredPublicCourses = publicCourses.filter(course =>
    course.course_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Welcome, {user?.name}</h1>
              <p className="text-sm text-gray-600">{user?.phone}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* My Courses Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
          </div>

          {myCourses.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GraduationCap className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">No Courses Yet</h3>
                <p className="text-gray-600 text-center mb-4">
                  You haven't been assigned any courses yet. Explore our public courses below or wait for an admin to assign you a course.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCourses.map((progress) => (
                <Card key={progress.id} className="bg-white hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-gray-900 truncate">
                        {progress.course_name}
                      </CardTitle>
                      {getStatusBadge(progress.status || 'unknown')}
                    </div>
                    <CardDescription>
                      Day {progress.current_day || 1} • {progress.progress_percent || 0}% Complete
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={14} />
                        <span>Started: {new Date(progress.created_at || '').toLocaleDateString()}</span>
                      </div>
                      {progress.completed_at && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle size={14} />
                          <span>Completed: {new Date(progress.completed_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {progress.status === 'suspended' && (
                        <div className="flex items-center gap-2 text-sm text-yellow-600">
                          <Pause size={14} />
                          <span>Course suspended</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Separator className="my-8" />

        {/* Explore Courses Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Search className="h-6 w-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Explore Public Courses</h2>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search courses..."
              className="pl-8 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredPublicCourses.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  {searchQuery ? 'No Courses Found' : 'No Public Courses Available'}
                </h3>
                <p className="text-gray-600 text-center">
                  {searchQuery 
                    ? 'No courses match your search criteria.' 
                    : 'Check back later for new public courses.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPublicCourses.map((course) => (
                <Card key={course.id} className="bg-white hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-gray-900 truncate">
                        {course.course_name}
                      </CardTitle>
                      {course.progress && getStatusBadge(course.progress.status || 'unknown')}
                    </div>
                    <CardDescription>
                      Public Course • Day {course.day}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Explore this self-paced learning course and enhance your skills.
                      </p>
                      {course.progress ? (
                        <div className="text-sm text-blue-600">
                          You are already enrolled in this course
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleSelfAssign(course)}
                          disabled={assigningCourse === course.id}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {assigningCourse === course.id ? 'Assigning...' : 'Enroll Now'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Confirm Dialog for Overwriting */}
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ open })}
          title="Overwrite Current Course?"
          description={
            confirmDialog.hasAdminAssigned
              ? "You have an active course assigned by an admin. You cannot overwrite admin-assigned courses."
              : "You have another active course. Enrolling in this new course will suspend your current progress. Continue?"
          }
          confirmText={confirmDialog.hasAdminAssigned ? "OK" : "Yes, Enroll"}
          cancelText="Cancel"
          onConfirm={() => {
            if (!confirmDialog.hasAdminAssigned && confirmDialog.course) {
              assignCourse(confirmDialog.course);
            }
          }}
          variant={confirmDialog.hasAdminAssigned ? "default" : "destructive"}
        />
      </div>
    </div>
  );
};

export default LearnerDashboard;
