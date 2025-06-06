
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, MessageCircle, TrendingUp } from 'lucide-react';

const Index = () => {
  const { user, userRole } = useMultiAuth();
  const [stats, setStats] = useState({
    totalLearners: 0,
    totalCourses: 0,
    messagesSent: 0,
    activeProgress: 0,
  });

  useEffect(() => {
    if (user && userRole) {
      fetchStats();
    }
  }, [user, userRole]);

  const fetchStats = async () => {
    try {
      let learnersQuery = supabase.from('learners').select('id', { count: 'exact' });
      let coursesQuery = supabase.from('courses').select('id', { count: 'exact' });
      let messagesQuery = supabase.from('messages_sent').select('id', { count: 'exact' });
      let progressQuery = supabase.from('course_progress').select('id', { count: 'exact' });

      // Filter based on user role
      if (userRole === 'admin') {
        learnersQuery = learnersQuery.eq('created_by', user?.id);
        coursesQuery = coursesQuery.eq('created_by', user?.id);
        messagesQuery = messagesQuery.eq('user_id', user?.id);
        progressQuery = progressQuery.in('learner_id', 
          supabase.from('learners').select('id').eq('created_by', user?.id)
        );
      }

      const [learners, courses, messages, progress] = await Promise.all([
        learnersQuery,
        coursesQuery,
        messagesQuery,
        progressQuery,
      ]);

      setStats({
        totalLearners: learners.count || 0,
        totalCourses: courses.count || 0,
        messagesSent: messages.count || 0,
        activeProgress: progress.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="w-full py-6 px-6 md:px-8 page-transition">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your microlearning platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Learners</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLearners}</div>
              <p className="text-xs text-muted-foreground">Active learners in your platform</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <p className="text-xs text-muted-foreground">Courses created</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.messagesSent}</div>
              <p className="text-xs text-muted-foreground">WhatsApp messages delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProgress}</div>
              <p className="text-xs text-muted-foreground">Learners with ongoing courses</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your platform</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No recent activity to display.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">
                Use the navigation menu to access learners, courses, and analytics.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
