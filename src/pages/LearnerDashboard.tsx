
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Clock, CheckCircle, Play, LogOut, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Course {
  id: string;
  course_name: string;
  day: number;
  module_1: string;
  module_2: string;
  module_3: string;
  created_at: string;
  request_id: string;
  status: string;
}

interface CourseProgress {
  id: string;
  course_id: string;
  course_name: string;
  status: string;
  current_day: number;
  progress_percent: number;
  started_at: string;
  completed_at: string;
}

const LearnerDashboard = () => {
  const { user, signOut } = useMultiAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<CourseProgress[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLearnerCourses();
      fetchAvailableCourses();
    }
  }, [user]);

  const fetchLearnerCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('phone_number', user?.phone);
      
      if (error) throw error;
      setEnrolledCourses(data || []);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    }
  };

  const fetchAvailableCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group courses by request_id and only show unique courses
      const uniqueCourses = data?.reduce((acc: Course[], course) => {
        const existingCourse = acc.find(c => c.request_id === course.request_id);
        if (!existingCourse) {
          acc.push(course);
        }
        return acc;
      }, []) || [];
      
      setAvailableCourses(uniqueCourses);
    } catch (error) {
      console.error('Error fetching available courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrollInCourse = async (courseRequestId: string, courseName: string) => {
    if (!user?.phone) {
      toast.error('Phone number is required for enrollment');
      return;
    }

    setEnrolling(courseRequestId);
    
    try {
      // Check if already enrolled
      const { data: existingProgress } = await supabase
        .from('course_progress')
        .select('*')
        .eq('phone_number', user.phone)
        .eq('course_name', courseName)
        .single();

      if (existingProgress) {
        toast.error('You are already enrolled in this course');
        setEnrolling(null);
        return;
      }

      // Get the first course from this request_id for course_id
      const { data: courseData } = await supabase
        .from('courses')
        .select('id')
        .eq('request_id', courseRequestId)
        .limit(1)
        .single();

      if (!courseData) {
        toast.error('Course not found');
        setEnrolling(null);
        return;
      }

      // Create course progress entry
      const { error: progressError } = await supabase
        .from('course_progress')
        .insert({
          learner_id: user.id,
          learner_name: user.name,
          course_id: courseData.id,
          course_name: courseName,
          phone_number: user.phone,
          status: 'assigned',
          current_day: 1,
          progress_percent: 0,
          is_active: true
        });

      if (progressError) throw progressError;

      toast.success('Successfully enrolled in course!');
      fetchLearnerCourses();
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast.error('Failed to enroll in course');
    } finally {
      setEnrolling(null);
    }
  };

  const viewCourseContent = async (course: Course) => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('request_id', course.request_id)
        .order('day', { ascending: true });
      
      if (error) throw error;
      setSelectedCourse({ ...course, modules: data });
    } catch (error) {
      console.error('Error fetching course content:', error);
      toast.error('Failed to load course content');
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'started': return 'bg-blue-500';
      case 'assigned': return 'bg-yellow-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Learner Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name}</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Enrolled Courses */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Courses
          </h2>
          {enrolledCourses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">You're not enrolled in any courses yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{course.course_name}</CardTitle>
                    <div className="flex items-center justify-between">
                      <Badge className={`${getStatusColor(course.status)} text-white`}>
                        {course.status}
                      </Badge>
                      <span className="text-sm text-gray-500">Day {course.current_day}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{course.progress_percent}%</span>
                        </div>
                        <Progress value={course.progress_percent} className="h-2" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1">
                          <Play className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Available Courses */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Available Courses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course) => {
              const isEnrolled = enrolledCourses.some(ec => ec.course_name === course.course_name);
              return (
                <Card key={course.request_id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{course.course_name}</CardTitle>
                    <CardDescription>
                      3-day course with interactive modules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>3 days • 9 modules</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewCourseContent(course)}
                          className="flex-1"
                        >
                          View Content
                        </Button>
                        {!isEnrolled && (
                          <Button
                            size="sm"
                            onClick={() => enrollInCourse(course.request_id, course.course_name)}
                            disabled={enrolling === course.request_id}
                            className="flex-1"
                          >
                            {enrolling === course.request_id ? 'Enrolling...' : 'Enroll'}
                          </Button>
                        )}
                        {isEnrolled && (
                          <Badge variant="secondary" className="px-3 py-1">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enrolled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Course Content Modal */}
        {selectedCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">{selectedCourse.course_name}</h3>
                  <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                    Close
                  </Button>
                </div>
                <div className="space-y-6">
                  {selectedCourse.modules?.map((dayContent: any, index: number) => (
                    <Card key={dayContent.id}>
                      <CardHeader>
                        <CardTitle>Day {dayContent.day}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {dayContent.module_1 && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <h4 className="font-medium mb-2">Module 1</h4>
                              <p className="text-sm text-gray-600">{dayContent.module_1}</p>
                            </div>
                          )}
                          {dayContent.module_2 && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <h4 className="font-medium mb-2">Module 2</h4>
                              <p className="text-sm text-gray-600">{dayContent.module_2}</p>
                            </div>
                          )}
                          {dayContent.module_3 && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <h4 className="font-medium mb-2">Module 3</h4>
                              <p className="text-sm text-gray-600">{dayContent.module_3}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnerDashboard;
