
import React, { useState, useEffect } from 'react';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { BookOpen, Calendar, Clock, Trophy, Plus } from 'lucide-react';

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
  course_name: string; // Fixed: Added course_name property
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
      
      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('learner_id', userProfile?.id)
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

  const handleEnrollCourse = async (course: Course) => {
    if (!userProfile) {
      toast({
        title: 'Error',
        description: 'Please log in to enroll in courses',
        variant: 'destructive',
      });
      return;
    }

    setEnrolling(course.id);

    try {
      console.log('📝 Enrolling in course:', course.course_name, 'User:', userProfile.name);

      // Check if already enrolled
      const { data: existingProgress } = await supabase
        .from('course_progress')
        .select('*')
        .eq('learner_id', userProfile.id)
        .eq('course_id', course.id)
        .single();

      if (existingProgress) {
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
          phone_number: userProfile.phone,
          course_name: course.course_name,
          current_day: 1,
          progress_percent: 0,
          status: 'in_progress',
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
      case 'in_progress':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrolledCourses.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Courses</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {enrolledCourses.filter(course => course.status === 'completed').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Courses</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Courses */}
        {enrolledCourses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">My Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((courseProgress) => (
                <Card key={courseProgress.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{courseProgress.course_name}</CardTitle>
                      <Badge className={getStatusColor(courseProgress.status)}>
                        {courseProgress.status}
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
                      <Button className="w-full" size="sm">
                        {courseProgress.status === 'completed' ? 'Review Course' : 'Continue Learning'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Courses */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Courses</h2>
          {courses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No courses available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const isEnrolled = enrolledCourses.some(ec => ec.course_id === course.id);
                
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
                          disabled={isEnrolled || enrolling === course.id}
                        >
                          {enrolling === course.id ? (
                            'Enrolling...'
                          ) : isEnrolled ? (
                            'Already Enrolled'
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
      </div>
    </div>
  );
};

export default LearnerDashboard;
