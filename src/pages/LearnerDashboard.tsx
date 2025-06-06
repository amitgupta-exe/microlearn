
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { CourseProgress, Course } from '@/lib/types';

const LearnerDashboard: React.FC = () => {
  const { user, userRole } = useMultiAuth();
  const [courseProgress, setCourseProgress] = useState<(CourseProgress & { course?: Course })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && userRole === 'learner') {
      fetchLearnerProgress();
    }
  }, [user, userRole]);

  const fetchLearnerProgress = async () => {
    try {
      const phone = user?.user_metadata?.phone;
      if (!phone) return;

      // Get learner info
      const { data: learner, error: learnerError } = await supabase
        .from('learners')
        .select('id')
        .eq('phone', phone)
        .single();

      if (learnerError) throw learnerError;

      // Get course progress with course details
      const { data: progress, error: progressError } = await supabase
        .from('course_progress')
        .select(`
          *,
          course:course_id (
            id,
            course_name,
            visibility,
            day,
            module_1,
            module_2,
            module_3
          )
        `)
        .eq('learner_id', learner.id);

      if (progressError) throw progressError;

      setCourseProgress(progress || []);
    } catch (error) {
      console.error('Error fetching learner progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'suspended':
        return <Clock className="h-4 w-4 text-red-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (userRole !== 'learner') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Access denied. This page is only for learners.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Learning Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your course progress and access your assignments</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading your courses...</span>
          </div>
        ) : courseProgress.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses assigned yet</h3>
              <p className="text-muted-foreground text-center">
                You haven't been assigned any courses yet. Please contact your instructor for course assignments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courseProgress.map((progress) => (
              <Card key={progress.id} className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {progress.course?.course_name || 'Unknown Course'}
                    </CardTitle>
                    {getStatusIcon(progress.status)}
                  </div>
                  <CardDescription>
                    <Badge variant={getStatusColor(progress.status)}>
                      {progress.status.replace('_', ' ')}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{progress.progress_percent || 0}%</span>
                    </div>
                    <Progress value={progress.progress_percent || 0} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Course Content:</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>• Day {progress.course?.day}: Module 1</div>
                      <div>• Day {progress.course?.day}: Module 2</div>
                      <div>• Day {progress.course?.day}: Module 3</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Started: {new Date(progress.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnerDashboard;
