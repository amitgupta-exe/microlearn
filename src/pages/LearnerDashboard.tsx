
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, Play, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Course {
  id: string;
  course_name: string;
  status?: string;
  request_id: string;
  day: number;
  module_1?: string;
  module_2?: string;
  module_3?: string;
  created_at: string;
}

interface GroupedCourse {
  request_id: string;
  course_name: string;
  total_days: number;
  all_modules: Course[];
}

interface CourseProgress {
  id: string;
  course_id: string;
  status: string;
  progress_percent: number;
  current_day: number;
}

const LearnerDashboard = () => {
  const { signOut, userProfile } = useMultiAuth();
  const navigate = useNavigate();
  const [availableCourses, setAvailableCourses] = useState<GroupedCourse[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<GroupedCourse | null>(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);

  console.log('LearnerDashboard - userProfile:', userProfile);

  useEffect(() => {
    if (userProfile) {
      fetchCourses();
      fetchEnrolledCourses();
    }
  }, [userProfile]);

  const fetchCourses = async () => {
    try {
      console.log('Fetching available courses...');
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching courses:', error);
        throw error;
      }

      console.log('Fetched courses:', courses);

      // Group courses by request_id
      const grouped = courses?.reduce((acc: { [key: string]: GroupedCourse }, course: Course) => {
        const requestId = course.request_id || 'no-request-id';
        
        if (!acc[requestId]) {
          acc[requestId] = {
            request_id: requestId,
            course_name: course.course_name || 'Untitled Course',
            total_days: 0,
            all_modules: []
          };
        }
        
        acc[requestId].all_modules.push(course);
        acc[requestId].total_days = Math.max(acc[requestId].total_days, course.day);
        return acc;
      }, {}) || {};

      setAvailableCourses(Object.values(grouped));
      console.log('Grouped courses:', Object.values(grouped));
    } catch (error) {
      console.error('Error in fetchCourses:', error);
      toast({
        title: "Error",
        description: "Failed to load available courses",
        variant: "destructive",
      });
    }
  };

  const fetchEnrolledCourses = async () => {
    try {
      console.log('Fetching enrolled courses for phone:', userProfile?.phone);
      const { data: progress, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('phone_number', userProfile?.phone);

      if (error) {
        console.error('Error fetching enrolled courses:', error);
        throw error;
      }

      console.log('Enrolled courses:', progress);
      setEnrolledCourses(progress || []);
    } catch (error) {
      console.error('Error in fetchEnrolledCourses:', error);
      toast({
        title: "Error",
        description: "Failed to load enrolled courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollCourse = async (course: GroupedCourse) => {
    try {
      console.log('Enrolling in course:', course);
      
      if (!userProfile?.phone) {
        toast({
          title: "Error",
          description: "Phone number not found. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Check if already enrolled
      const { data: existingProgress } = await supabase
        .from('course_progress')
        .select('id')
        .eq('phone_number', userProfile.phone)
        .eq('course_id', course.all_modules[0]?.id);

      if (existingProgress && existingProgress.length > 0) {
        toast({
          title: "Already Enrolled",
          description: "You are already enrolled in this course.",
          variant: "destructive",
        });
        return;
      }

      // Create course progress entry
      const { error: progressError } = await supabase
        .from('course_progress')
        .insert({
          learner_name: userProfile.name,
          course_id: course.all_modules[0]?.id,
          course_name: course.course_name,
          phone_number: userProfile.phone,
          status: 'assigned',
          current_day: 1,
          progress_percent: 0,
        });

      if (progressError) {
        console.error('Error creating course progress:', progressError);
        throw progressError;
      }

      toast({
        title: "Enrolled Successfully",
        description: `You have been enrolled in ${course.course_name}`,
      });

      // Refresh enrolled courses
      await fetchEnrolledCourses();
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast({
        title: "Error",
        description: "Failed to enroll in course",
        variant: "destructive",
      });
    }
  };

  const handleViewCourseDetails = (course: GroupedCourse) => {
    setSelectedCourse(course);
    setShowCourseDetails(true);
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
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Learner Dashboard</h1>
            <p className="text-gray-600">Welcome back, {userProfile?.name}</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Enrolled Courses Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My Enrolled Courses</h2>
          {enrolledCourses.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">You haven't enrolled in any courses yet.</p>
                <p className="text-sm text-gray-400">Browse available courses below to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((progress) => (
                <Card key={progress.id} className="bg-white hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg text-gray-900">{progress.course_name}</CardTitle>
                      <Badge className={`${getStatusColor(progress.status)} text-white`}>
                        {progress.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{progress.progress_percent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${progress.progress_percent}%` }}
                          ></div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Day {progress.current_day}</p>
                      <div className="flex gap-2">
                        {progress.status === 'assigned' && (
                          <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600">
                            <Play className="h-4 w-4 mr-1" />
                            Start Course
                          </Button>
                        )}
                        {progress.status === 'started' && (
                          <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                            <Play className="h-4 w-4 mr-1" />
                            Continue
                          </Button>
                        )}
                        {progress.status === 'completed' && (
                          <Button size="sm" variant="outline" className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Available Courses Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Courses</h2>
          {availableCourses.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No courses available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCourses.map((course) => (
                <Card key={course.request_id} className="bg-white hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900">{course.course_name}</CardTitle>
                    <CardDescription className="text-gray-600">
                      {course.total_days} days • {course.all_modules.length} modules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleViewCourseDetails(course)}
                        variant="outline" 
                        size="sm"
                      >
                        View Details
                      </Button>
                      <Button 
                        onClick={() => handleEnrollCourse(course)}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        Enroll Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Course Details Modal */}
      {showCourseDetails && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedCourse.course_name}</h3>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCourseDetails(false)}
                >
                  Close
                </Button>
              </div>
              <div className="space-y-6">
                {selectedCourse.all_modules.map((module, index) => (
                  <Card key={module.id} className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900">
                        Day {module.day} - Module {index + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {module.module_1 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Module 1:</h4>
                          <p className="text-gray-600 whitespace-pre-wrap">{module.module_1}</p>
                        </div>
                      )}
                      {module.module_2 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Module 2:</h4>
                          <p className="text-gray-600 whitespace-pre-wrap">{module.module_2}</p>
                        </div>
                      )}
                      {module.module_3 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Module 3:</h4>
                          <p className="text-gray-600 whitespace-pre-wrap">{module.module_3}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerDashboard;
