
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Users, BookOpen, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMultiAuth } from '@/contexts/MultiAuthContext';

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

interface AdminStats {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  learner_count: number;
  course_count: number;
}

const SuperAdminDashboard = () => {
  const { signOut } = useMultiAuth();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  console.log('SuperAdminDashboard loading...');

  useEffect(() => {
    fetchRegistrationRequests();
    fetchAdminStats();
  }, []);

  /**
   * Fetch all registration requests for approval
   */
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

      console.log('Fetched registration requests:', data?.length);
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching registration requests:', error);
      toast.error('Failed to load registration requests');
    }
  };

  /**
   * Fetch admin statistics (learners and courses count)
   */
  const fetchAdminStats = async () => {
    try {
      console.log('Fetching admin statistics...');
      
      // Get all admin users
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (adminError) {
        console.error('Error fetching admins:', adminError);
        throw adminError;
      }

      // Get learner counts for each admin
      const adminStatsPromises = admins?.map(async (admin) => {
        const [learnersResult, coursesResult] = await Promise.all([
          supabase
            .from('learners')
            .select('id', { count: 'exact' })
            .eq('created_by', admin.id),
          supabase
            .from('courses')
            .select('request_id')
            .eq('created_by', admin.id)
        ]);

        // Count unique request_ids for courses
        const uniqueCourses = coursesResult.data?.reduce((acc: string[], course) => {
          if (course.request_id && !acc.includes(course.request_id)) {
            acc.push(course.request_id);
          }
          return acc;
        }, []) || [];

        return {
          ...admin,
          learner_count: learnersResult.count || 0,
          course_count: uniqueCourses.length
        };
      }) || [];

      const adminStatsData = await Promise.all(adminStatsPromises);
      console.log('Admin statistics:', adminStatsData);
      setAdminStats(adminStatsData);

    } catch (error) {
      console.error('Error fetching admin statistics:', error);
      toast.error('Failed to load admin statistics');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update registration request status
   */
  const updateRegistrationStatus = async (requestId: string, status: string) => {
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

      // Update local state
      setRequests(prev => 
        prev.map(request => 
          request.request_id === requestId 
            ? { ...request, approval_status: status }
            : request
        )
      );

      toast.success(`Registration request ${status} successfully`);
    } catch (error) {
      console.error('Error updating registration status:', error);
      toast.error('Failed to update registration status');
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Filter requests based on search query
  const filteredRequests = requests.filter(request =>
    request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.number.includes(searchQuery) ||
    request.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage registration requests and admin statistics</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        {/* Admin Statistics */}
        <Card className="mb-8 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Admin Statistics
            </CardTitle>
            <CardDescription className="text-gray-600">
              Overview of all admin users and their activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading admin statistics...</span>
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-700">Admin Name</TableHead>
                      <TableHead className="text-gray-700">Email</TableHead>
                      <TableHead className="text-gray-700">Phone</TableHead>
                      <TableHead className="text-gray-700">Learners</TableHead>
                      <TableHead className="text-gray-700">Courses</TableHead>
                      <TableHead className="text-gray-700">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminStats.map((admin) => (
                      <TableRow key={admin.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">
                          {admin.name}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {admin.email}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {admin.phone || 'Not provided'}
                        </TableCell>
                        <TableCell className="text-gray-900">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {admin.learner_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-900">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {admin.course_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Requests */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Registration Requests
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Review and approve registration requests
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search requests..."
                  className="pl-8 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading registration requests...</span>
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-700">Name</TableHead>
                      <TableHead className="text-gray-700">Phone</TableHead>
                      <TableHead className="text-gray-700">Topic</TableHead>
                      <TableHead className="text-gray-700">Goal</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-gray-700">Created</TableHead>
                      <TableHead className="text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-32 text-gray-500">
                          {searchQuery ? 'No registration requests match your search' : 'No registration requests found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((request) => (
                        <TableRow key={request.request_id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">
                            {request.name}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {request.number}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {request.topic}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {request.goal}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary"
                              className={`${getStatusColor(request.approval_status)} text-white`}
                            >
                              {request.approval_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(request.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={request.approval_status}
                              onValueChange={(value) => 
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
