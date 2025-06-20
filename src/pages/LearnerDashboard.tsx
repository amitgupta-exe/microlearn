
import React, { useState, useEffect } from 'react';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { BookOpen, Calendar, Clock, Trophy, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConfirmDialog from '@/components/ConfirmDialog';
import { normalizePhoneNumber } from '@/lib/utils';

interface Course {
  id: string;
  course_name: string;
  day: number;
  created_at: string;
  status: string;
  request_id: string;
}

interface CourseProgress {
  id: string;
  course_id: string;
  learner_id: string;
  course_name: string;
  progress_percent: number;
  current_day: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

const LearnerDashboard: React.FC = () => {
  const { user, userProfile, signOut } = useMultiAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    course?: Course;
    existingCourse?: string;
  }>({ open: false });

  console.log('LearnerDashboard - userProfile:', userProfile);

  useEffect(() => {
    fetchAvailableCourses();
    if (userProfile) {
      fetchEnrolledCourses();
    }
  }, [userProfile]);

  const fetchAvailableCourses = async () => {
    try {
      console.log('📚 Fetching available courses...');
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching courses:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch available courses',
          variant: 'destructive',
        });
        return;
      }

      console.log('📋 All courses:', data);

      // Group courses by request_id and take the latest one for each request_id
      const uniqueCourses = data?.reduce((acc: Course[], course) => {
        const existingCourse = acc.find(c => c.request_id === course.request_id);
        if (!existingCourse) {
          acc.push(course);
        }
        return acc;
      }, []) || [];

      console.log('✅ Unique courses (grouped by request_id):', uniqueCourses);
      setCourses(uniqueCourses);
    } catch (error) {
      console.error('💥 Exception fetching courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch courses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledCourses = async () => {
    try {
      console.log('📖 Fetching enrolled courses for user:', userProfile?.id);
      
      const normalizedPhone = normalizePhoneNumber(userProfile?.phone || '');
      
      // Fetch by both learner_id and phone_number for comprehensive results
      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .or(`learner_id.eq.${userProfile?.id},phone_number.eq.${normalizedPhone}`)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching enrolled courses:', error);
        return;
      }

      console.log('📋 Enrolled courses:', data);
      setEnrolledCourses(data || []);
    } catch (error) {
      console.error('💥 Exception fetching enrolled courses:', error);
    }
  };

  const checkExistingProgress = async (): Promise<string | null> => {
    if (!userProfile) return null;
    
    const normalizedPhone = normalizePhoneNumber(userProfile.phone || '');
    
    const { data: existingActive } = await supabase
      .from('course_progress')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .in('status', ['assigned', 'started']);

    if (existingActive && existingActive.length > 0) {
      return existingActive[0].course_name;
    }

    return null;
  };

  const handleEnrollCourse = async (course: Course, confirmOverwrite: boolean = false) => {
    if (!userProfile) {
      toast({
        title: 'Error',
        description: 'Please log in to enroll in courses',
        variant: 'destructive',
      });
      return;
    }

    // Check for existing active courses if not confirming overwrite
    if (!confirmOverwrite) {
      const existingCourseName = await checkExistingProgress();
      if (existingCourseName) {
        setConfirmDialog({
          open: true,
          course,
          existingCourse: existingCourseName
        });
        return;
      }
    }

    setEnrolling(course.id);

    try {
      console.log('📝 Enrolling in course:', course.course_name, 'User:', userProfile.name);

      const normalizedPhone = normalizePhoneNumber(userProfile.phone || '');

      // If confirming overwrite, suspend existing courses
      if (confirmOverwrite) {
        await supabase
          .from('course_progress')
          .update({ status: 'suspended' })
          .eq('phone_number', normalizedPhone)
          .in('status', ['assigned', 'started']);
      }

      // Check if already enrolled in this specific course
      const { data: existingProgress } = await supabase
        .from('course_progress')
        .select('*')
        .eq('learner_id', userProfile.id)
        .eq('course_id', course.id)
        .single();

      if (existingProgress && !confirmOverwrite) {
        toast({
          title: 'Already Enrolled',
          description: `You are already enrolled in ${course.course_name}`,
          variant: 'destructive',
        });
        setEnrolling(null);
        return;
      }

      // Create course progress entry
      const { data: progressData, error: progressError } = await supabase
        .from('course_progress')
        .insert({
          learner_id: userProfile.id,
          course_id: course.id,
          learner_name: userProfile.name,
          phone_number: normalizedPhone,
          course_name: course.course_name,
          current_day: 1,
          progress_percent: 0,
          status: 'assigned',
          started_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (progressError) {
        console.error('❌ Error creating course progress:', progressError);
        toast({
          title: 'Enrollment Failed',
          description: progressError.message,
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Successfully enrolled in course:', progressData);

      toast({
        title: 'Enrollment Successful',
        description: `You have been enrolled in ${course.course_name}`,
      });

      // Refresh enrolled courses
      fetchEnrolledCourses();
    } catch (error) {
      console.error('💥 Exception during enrollment:', error);
      toast({
        title: 'Enrollment Error',
        description: 'Failed to enroll in course',
        variant: 'destructive',
      });
    } finally {
      setEnrolling(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'assigned':
      case 'started':
        return 'bg-blue-500';
      case 'suspended':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'Assigned';
      case 'started':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'suspended':
        return 'Suspended';
      default:
        return status;
    }
  };

  // Filter courses for search
  const filteredCourses = courses.filter(course =>
    course.course_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group enrolled courses by status
  const activeCourses = enrolledCourses.filter(course => 
    course.status === 'assigned' || course.status === 'started'
  );
  const completedCourses = enrolledCourses.filter(course => 
    course.status === 'completed'
  );
  const suspendedCourses = enrolledCourses.filter(course => 
    course.status === 'suspended'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {userProfile?.name || 'Learner'}!
              </h1>
              <p className="text-gray-600 mt-2">Continue your learning journey</p>
            </div>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCourses.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedCourses.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspended</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{suspendedCourses.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courses.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Course Tabs */}
          <Tabs defaultValue="my-courses" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-courses">My Courses</TabsTrigger>
              <TabsTrigger value="explore">Explore Courses</TabsTrigger>
            </TabsList>

            {/* My Courses Tab */}
            <TabsContent value="my-courses" className="space-y-6">
              {/* Active Courses */}
              {activeCourses.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Courses</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeCourses.map((courseProgress) => (
                      <Card key={courseProgress.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{courseProgress.course_name}</CardTitle>
                            <Badge className={getStatusColor(courseProgress.status)}>
                              {getStatusText(courseProgress.status)}
                            </Badge>
                          </div>
                          <CardDescription>
                            Day {courseProgress.current_day} • {courseProgress.progress_percent}% complete
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <Progress value={courseProgress.progress_percent} className="w-full" />
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Started: {new Date(courseProgress.started_at).toLocaleDateString()}
                              </div>
                            </div>
                            <Button className="w-full" size="sm">
                              Continue Learning
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous Courses */}
              {(completedCourses.length > 0 || suspendedCourses.length > 0) && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Previous Courses</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...completedCourses, ...suspendedCourses].map((courseProgress) => (
                      <Card key={courseProgress.id} className="hover:shadow-lg transition-shadow opacity-75">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{courseProgress.course_name}</CardTitle>
                            <Badge className={getStatusColor(courseProgress.status)}>
                              {getStatusText(courseProgress.status)}
                            </Badge>
                          </div>
                          <CardDescription>
                            Day {courseProgress.current_day} • {courseProgress.progress_percent}% complete
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <Progress value={courseProgress.progress_percent} className="w-full" />
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Started: {new Date(courseProgress.started_at).toLocaleDateString()}
                              </div>
                              {courseProgress.completed_at && (
                                <div className="flex items-center">
                                  <Trophy className="h-4 w-4 mr-1" />
                                  Completed
                                </div>
                              )}
                            </div>
                            <Button className="w-full" size="sm" variant="outline">
                              {courseProgress.status === 'completed' ? 'Review Course' : 'View Details'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {enrolledCourses.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">You haven't enrolled in any courses yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Explore the available courses to get started!</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Explore Courses Tab */}
            <TabsContent value="explore" className="space-y-6">
              {/* Search Bar */}
              <div className="relative max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Available Courses */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Available Courses ({filteredCourses.length})
                </h2>
                {filteredCourses.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        {searchQuery ? 'No courses match your search' : 'No courses available at the moment.'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => {
                      const isEnrolled = enrolledCourses.some(ec => ec.course_id === course.id);
                      const isActive = activeCourses.some(ec => ec.course_id === course.id);
                      
                      return (
                        <Card key={course.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <CardTitle className="text-lg">{course.course_name}</CardTitle>
                            <CardDescription>
                              Day {course.day} • {new Date(course.created_at).toLocaleDateString()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-1" />
                                Duration: {course.day} day{course.day > 1 ? 's' : ''}
                              </div>
                              <Button
                                className="w-full"
                                onClick={() => handleEnrollCourse(course)}
                                disabled={enrolling === course.id}
                                variant={isActive ? "outline" : "default"}
                              >
                                {enrolling === course.id ? (
                                  'Enrolling...'
                                ) : isActive ? (
                                  'Currently Enrolled'
                                ) : isEnrolled ? (
                                  'Enroll Again'
                                ) : (
                                  'Enroll Now'
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open })}
        title="Overwrite Current Course?"
        description={`You are currently enrolled in "${confirmDialog.existingCourse}". Enrolling in "${confirmDialog.course?.course_name}" will suspend your current progress. Continue?`}
        confirmText="Yes, Enroll in New Course"
        cancelText="Cancel"
        onConfirm={() => {
          if (confirmDialog.course) {
            handleEnrollCourse(confirmDialog.course, true);
          }
        }}
        variant="destructive"
      />
    </>
  );
};

export default LearnerDashboard;
