
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, MessageCircle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user, userRole, loading } = useMultiAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalLearners: 0,
    totalCourses: 0,
    messagesSent: 0,
    activeProgress: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
      return;
    }

    if (user && userRole) {
      fetchStats();
    }
  }, [user, userRole, loading, navigate]);

  const fetchStats = async () => {
    try {
      let learnersQuery = supabase.from('learners').select('id', { count: 'exact' });
      let coursesQuery = supabase.from('courses').select('request_id, created_by');
      let messagesQuery = supabase.from('messages_sent').select('id', { count: 'exact' });
      let progressQuery = supabase.from('course_progress').select('id', { count: 'exact' }).eq('status', 'assigned');

      // Filter based on user role
      if (userRole === 'admin') {
        learnersQuery = learnersQuery.eq('created_by', user?.id);
        coursesQuery = coursesQuery.eq('created_by', user?.id);
        messagesQuery = messagesQuery.eq('user_id', user?.id);
        
        // Get learner IDs for this admin first
        const { data: adminLearners } = await supabase
          .from('learners')
          .select('id')
          .eq('created_by', user?.id);
        
        const learnerIds = adminLearners?.map(l => l.id) || [];
        if (learnerIds.length > 0) {
          progressQuery = progressQuery.in('learner_id', learnerIds).eq('status', 'assigned');
        } else {
          progressQuery = progressQuery.eq('learner_id', 'none').eq('status', 'assigned'); // No results
        }
      }

      const [learners, coursesResult, messages, progress] = await Promise.all([
        learnersQuery,
        coursesQuery,
        messagesQuery,
        progressQuery,
      ]);

      // Count unique request_id values
      const uniqueRequestIds = new Set((coursesResult.data || []).map((course: { request_id: string }) => course.request_id));

      setStats({
        totalLearners: learners.count || 0,
        totalCourses: uniqueRequestIds.size,
        messagesSent: messages.count || 0,
        activeProgress: progress.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

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
