
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, BookOpen, FileText, TrendingUp, CheckCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Analytics {
  totalCourses: number;
  totalLearners: number;
  totalRegistrations: number;
  approvedCourses: number;
  pendingCourses: number;
  activeLearners: number;
}

interface RegistrationRequest {
  request_id: string;
  name: string;
  number: string;
  topic: string;
  goal: string;
  style: string;
  language: string;
  approval_status: string;
  created_at: string;
}

interface GroupedCourse {
  request_id: string;
  course_name: string;
  status: string;
  created_at: string;
  modules: any[];
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
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([]);
  const [groupedCourses, setGroupedCourses] = useState<GroupedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchRegistrationRequests();
    fetchCourses();
  }, []);

  const fetchAnalytics = async () => {
    try {
      console.log('Fetching analytics...');
      
      // Fetch course analytics
      const { data: courses } = await supabase.from('courses').select('status');
      const { data: learners } = await supabase.from('users').select('role').eq('role', 'learner');
      const { data: registrations } = await supabase.from('registration_requests').select('approval_status');
      const { data: courseProgress } = await supabase.from('course_progress').select('status');

      const totalCourses = courses?.length || 0;
      const approvedCourses = courses?.filter(c => c.status === 'approved').length || 0;
      const pendingCourses = courses?.filter(c => c.status === 'pending').length || 0;
      
      const totalLearners = learners?.length || 0;
      const activeLearners = courseProgress?.filter(cp => cp.status === 'started' || cp.status === 'assigned').length || 0;
      
      const totalRegistrations = registrations?.length || 0;

      console.log('Analytics:', {
        totalCourses,
        totalLearners,
        totalRegistrations,
        approvedCourses,
        pendingCourses,
        activeLearners,
      });

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
    }
  };

  const fetchRegistrationRequests = async () => {
    try {
      console.log('Fetching registration requests...');
      const { data, error } = await supabase
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching registration requests:', error);
        throw error;
      }

      console.log('Registration requests:', data);
      setRegistrationRequests(data || []);
    } catch (error) {
      console.error('Error in fetchRegistrationRequests:', error);
      toast.error('Failed to load registration requests');
    }
  };

  const fetchCourses = async () => {
    try {
      console.log('Fetching courses...');
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching courses:', error);
        throw error;
      }

      console.log('Courses:', data);

      // Group courses by request_id
      const grouped = data?.reduce((acc: { [key: string]: GroupedCourse }, course: any) => {
        const requestId = course.request_id || 'no-request-id';
        
        if (!acc[requestId]) {
          acc[requestId] = {
            request_id: requestId,
            course_name: course.course_name || 'Untitled Course',
            status: course.status || 'pending',
            created_at: course.created_at || '',
            modules: []
          };
        }
        
        acc[requestId].modules.push(course);
        return acc;
      }, {}) || {};

      console.log('Grouped courses:', Object.values(grouped));
      setGroupedCourses(Object.values(grouped));
    } catch (error) {
      console.error('Error in fetchCourses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const updateRegistrationStatus = async (requestId: string, status: 'pending' | 'approved' | 'rejected') => {
    try {
      console.log('Updating registration status:', requestId, status);
      
      const { error } = await supabase
        .from('registration_requests')
        .update({ approval_status: status })
        .eq('request_id', requestId);

      if (error) {
        console.error('Error updating registration status:', error);
        throw error;
      }

      setRegistrationRequests(prev => 
        prev.map(request => 
          request.request_id === requestId 
            ? { ...request, approval_status: status }
            : request
        )
      );

      toast.success(`Registration ${status} successfully`);
      await fetchAnalytics(); // Refresh analytics
    } catch (error) {
      console.error('Error updating registration status:', error);
      toast.error('Failed to update registration status');
    }
  };

  const updateCourseStatus = async (requestId: string, status: 'pending' | 'approved' | 'rejected') => {
    try {
      console.log('Updating course status:', requestId, status);
      
      const { error } = await supabase
        .from('courses')
        .update({ status })
        .eq('request_id', requestId);

      if (error) {
        console.error('Error updating course status:', error);
        throw error;
      }

      setGroupedCourses(prev => 
        prev.map(course => 
          course.request_id === requestId 
            ? { ...course, status }
            : course
        )
      );

      toast.success(`Course ${status} successfully`);
      await fetchAnalytics(); // Refresh analytics
    } catch (error) {
      console.error('Error updating course status:', error);
      toast.error('Failed to update course status');
    }
  };

  const handleSignOut = () => {
    console.log('Super admin signing out...');
    signOut();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
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
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Topic</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrationRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-32 text-gray-500">
                            No registration requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        registrationRequests.map((request) => (
                          <TableRow key={request.request_id}>
                            <TableCell className="font-medium">{request.name}</TableCell>
                            <TableCell>{request.number}</TableCell>
                            <TableCell>{request.topic}</TableCell>
                            <TableCell>{request.goal}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary"
                                className={`${getStatusColor(request.approval_status)} text-white`}
                              >
                                {request.approval_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={request.approval_status}
                                onValueChange={(value: 'pending' | 'approved' | 'rejected') => 
                                  updateRegistrationStatus(request.request_id, value)
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Modules</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead>View Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedCourses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-32 text-gray-500">
                            No course requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        groupedCourses.map((course) => (
                          <TableRow key={course.request_id}>
                            <TableCell className="font-mono text-sm">
                              {course.request_id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="font-medium">{course.course_name}</TableCell>
                            <TableCell>{course.modules.length} modules</TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary"
                                className={`${getStatusColor(course.status)} text-white`}
                              >
                                {course.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(course.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={course.status}
                                onValueChange={(value: 'pending' | 'approved' | 'rejected') => 
                                  updateCourseStatus(course.request_id, value)
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate('/superadmin/course-approval')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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
