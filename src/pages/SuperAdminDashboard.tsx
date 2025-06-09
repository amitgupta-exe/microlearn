
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, BookOpen, FileText, TrendingUp, CheckCircle } from 'lucide-react';

interface Analytics {
  totalCourses: number;
  totalLearners: number;
  totalRegistrations: number;
  approvedCourses: number;
  pendingCourses: number;
  activeLearners: number;
}

const SuperAdminDashboard = () => {
  const { signOut, userProfile } = useMultiAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics>({
    totalCourses: 0,
    totalLearners: 0,
    totalRegistrations: 0,
    approvedCourses: 0,
    pendingCourses: 0,
    activeLearners: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch course analytics
      const { data: courses } = await supabase.from('courses').select('status');
      const { data: learners } = await supabase.from('learners').select('status');
      const { data: registrations } = await supabase.from('registration_requests').select('approval_status');
      const { data: courseProgress } = await supabase.from('course_progress').select('status');

      const totalCourses = courses?.length || 0;
      const approvedCourses = courses?.filter(c => c.status === 'approved').length || 0;
      const pendingCourses = courses?.filter(c => c.status === 'pending').length || 0;
      
      const totalLearners = learners?.length || 0;
      const activeLearners = learners?.filter(l => l.status === 'active').length || 0;
      
      const totalRegistrations = registrations?.length || 0;

      setAnalytics({
        totalCourses,
        totalLearners,
        totalRegistrations,
        approvedCourses,
        pendingCourses,
        activeLearners,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600">Welcome back, {userProfile?.name}</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalCourses}</div>
              <p className="text-xs text-blue-100">
                {analytics.approvedCourses} approved, {analytics.pendingCourses} pending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Learners</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalLearners}</div>
              <p className="text-xs text-green-100">
                {analytics.activeLearners} active learners
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registration Requests</CardTitle>
              <FileText className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalRegistrations}</div>
              <p className="text-xs text-purple-100">Total requests received</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Course Completion</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-orange-100">Average completion rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="registrations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registrations" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Registration Approval
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Course Approval
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Registration Requests Management
                </CardTitle>
                <CardDescription>
                  Review and approve learner registration requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Registration approval functionality</p>
                  <p className="text-sm text-gray-400">
                    This section would contain the registration approval interface
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Course Approval Management
                </CardTitle>
                <CardDescription>
                  Review and approve course content submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Course approval functionality is available</p>
                  <Button 
                    onClick={() => navigate('/admin/course-approval')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Go to Course Approval
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
