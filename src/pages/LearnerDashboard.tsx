
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, Clock, CheckCircle, Play, LogOut, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { toast } from 'sonner';
import { CourseProgress, Course } from '@/lib/types';
import { useNavigate } from 'react-router-dom';

interface CourseProgressWithCourse extends CourseProgress {
  course?: Course | null;
}

const LearnerDashboard = () => {
  const { user, userProfile, signOut } = useMultiAuth();
  const [courseProgress, setCourseProgress] = useState<CourseProgressWithCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && userProfile) {
      fetchLearnerData();
    }
  }, [user, userProfile]);

  const fetchLearnerData = async () => {
    try {
      // First get the learner record
      const { data: learner, error: learnerError } = await supabase
        .from('learners')
        .select('*')
        .eq('phone', userProfile?.phone)
        .single();

      if (learnerError && learnerError.code !== 'PGRST116') {
        console.error('Error fetching learner:', learnerError);
        // If learner doesn't exist, still try to fetch available courses
      }

      // Get course progress if learner exists
      let progressWithCourses: CourseProgressWithCourse[] = [];
      if (learner) {
        const { data: progress, error: progressError } = await supabase
          .from('course_progress')
          .select('*')
          .eq('learner_id', learner.id);

        if (progressError) {
          console.error('Error fetching course progress:', progressError);
        } else if (progress) {
          // Get course details for each progress record
          progressWithCourses = await Promise.all(
            progress.map(async (prog) => {
              if (prog.course_id) {
                const { data: course } = await supabase
                  .from('courses')
                  .select('*')
                  .eq('id', prog.course_id)
                  .single();
                
                return { ...prog, course };
              }
              return prog;
            })
          );
        }
      }

      // Get available approved courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'approved')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
      }

      setCourseProgress(progressWithCourses);
      setAvailableCourses(courses || []);
    } catch (error) {
      console.error('Error fetching learner data:', error);
      toast.error('Failed to load learner data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'not_started': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'not_started': return 'Not Started';
      default: return 'Available';
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userProfile?.name || 'Learner'}!
            </h1>
            <p className="text-gray-600">Continue your learning journey</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Your Courses Section */}
        {courseProgress.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Enrolled Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courseProgress.map((progress) => (
                <Card key={progress.id} className="hover:shadow-lg transition-shadow bg-white">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2 text-gray-900">
                          {progress.course?.course_name || progress.course_name || 'Untitled Course'}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          Day {progress.current_day || 1}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`${getStatusColor(progress.status)} text-white`}
                      >
                        {getStatusText(progress.status)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-gray-900">{progress.progress_percent || 0}%</span>
                      </div>
                      <Progress value={progress.progress_percent || 0} className="h-2" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${
                          progress.day1_module1 ? 'bg-green-500 text-white' : 'bg-gray-200'
                        }`}>
                          {progress.day1_module1 ? <CheckCircle className="h-3 w-3" /> : '1'}
                        </div>
                        <div className="text-gray-600">Day 1</div>
                      </div>
                      <div className="text-center">
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${
                          progress.day2_module1 ? 'bg-green-500 text-white' : 'bg-gray-200'
                        }`}>
                          {progress.day2_module1 ? <CheckCircle className="h-3 w-3" /> : '2'}
                        </div>
                        <div className="text-gray-600">Day 2</div>
                      </div>
                      <div className="text-center">
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${
                          progress.day3_module1 ? 'bg-green-500 text-white' : 'bg-gray-200'
                        }`}>
                          {progress.day3_module1 ? <CheckCircle className="h-3 w-3" /> : '3'}
                        </div>
                        <div className="text-gray-600">Day 3</div>
                      </div>
                    </div>

                    {progress.status !== 'completed' && (
                      <Button className="w-full" variant="default">
                        <Play className="h-4 w-4 mr-2" />
                        Continue Learning
                      </Button>
                    )}

                    {progress.feedback && (
                      <div className="text-sm">
                        <p className="font-medium mb-1 text-gray-700">Your Feedback:</p>
                        <p className="text-gray-600 italic">{progress.feedback}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Courses Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {courseProgress.length > 0 ? 'Discover More Courses' : 'Available Courses'}
          </h2>
          
          {availableCourses.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-700">No Courses Available</h3>
                <p className="text-gray-500">
                  {courseProgress.length === 0 
                    ? "You haven't been assigned any courses yet. Please contact your administrator."
                    : "No additional courses are available at this time."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900">
                      {course.course_name || 'Untitled Course'}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Day {course.day} content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setSelectedCourse(course)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Course Content
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
                        <DialogHeader>
                          <DialogTitle className="text-gray-900">{course.course_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {course.module_1 && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">Module 1:</h4>
                              <p className="text-gray-600 whitespace-pre-wrap">{course.module_1}</p>
                            </div>
                          )}
                          {course.module_2 && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">Module 2:</h4>
                              <p className="text-gray-600 whitespace-pre-wrap">{course.module_2}</p>
                            </div>
                          )}
                          {course.module_3 && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">Module 3:</h4>
                              <p className="text-gray-600 whitespace-pre-wrap">{course.module_3}</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearnerDashboard;
