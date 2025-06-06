
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, CheckCircle, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { toast } from 'sonner';
import { CourseProgress, Course } from '@/lib/types';

interface CourseProgressWithCourse extends CourseProgress {
  course?: Course | null;
}

const LearnerDashboard = () => {
  const { user, userProfile } = useMultiAuth();
  const [courseProgress, setCourseProgress] = useState<CourseProgressWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && userProfile) {
      fetchCourseProgress();
    }
  }, [user, userProfile]);

  const fetchCourseProgress = async () => {
    try {
      // First get the learner record
      const { data: learner, error: learnerError } = await supabase
        .from('learners')
        .select('*')
        .eq('phone', userProfile?.phone)
        .single();

      if (learnerError || !learner) {
        console.error('Error fetching learner:', learnerError);
        return;
      }

      // Then get course progress
      const { data: progress, error: progressError } = await supabase
        .from('course_progress')
        .select('*')
        .eq('learner_id', learner.id);

      if (progressError) {
        console.error('Error fetching course progress:', progressError);
        return;
      }

      // Get course details for each progress record
      const progressWithCourses = await Promise.all(
        (progress || []).map(async (prog) => {
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

      setCourseProgress(progressWithCourses);
    } catch (error) {
      console.error('Error fetching course progress:', error);
      toast.error('Failed to load course progress');
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
      default: return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full py-6 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {userProfile?.name || 'Learner'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your learning progress and continue your courses.
            </p>
          </div>

          {courseProgress.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Courses Yet</h3>
                <p className="text-muted-foreground">
                  You haven't been assigned any courses yet. Please contact your administrator.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courseProgress.map((progress) => (
                <Card key={progress.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {progress.course?.course_name || progress.course_name || 'Untitled Course'}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
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
                        <span>Progress</span>
                        <span>{progress.progress_percent || 0}%</span>
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
                        <div>Day 1</div>
                      </div>
                      <div className="text-center">
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${
                          progress.day2_module1 ? 'bg-green-500 text-white' : 'bg-gray-200'
                        }`}>
                          {progress.day2_module1 ? <CheckCircle className="h-3 w-3" /> : '2'}
                        </div>
                        <div>Day 2</div>
                      </div>
                      <div className="text-center">
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${
                          progress.day3_module1 ? 'bg-green-500 text-white' : 'bg-gray-200'
                        }`}>
                          {progress.day3_module1 ? <CheckCircle className="h-3 w-3" /> : '3'}
                        </div>
                        <div>Day 3</div>
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
                        <p className="font-medium mb-1">Your Feedback:</p>
                        <p className="text-muted-foreground italic">{progress.feedback}</p>
                      </div>
                    )}
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
