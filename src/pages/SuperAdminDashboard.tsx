
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, Users, FileText, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RegistrationRequest } from '@/lib/types';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard = () => {
  const { signOut, userProfile } = useMultiAuth();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const typedRequests: RegistrationRequest[] = data.map(request => ({
        ...request,
        approval_status: request.approval_status as 'pending' | 'approved' | 'rejected'
      }));

      setRequests(typedRequests);
    } catch (error) {
      console.error('Error fetching registration requests:', error);
      toast.error('Failed to load registration requests');
    } finally {
      setIsLoading(false);
    }
  };

  const updateApprovalStatus = async (requestId: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase
        .from('registration_requests')
        .update({ approval_status: status })
        .eq('request_id', requestId);

      if (error) {
        throw error;
      }

      setRequests(requests.map(req => 
        req.request_id === requestId 
          ? { ...req, approval_status: status }
          : req
      ));

      toast.success(`Request ${status} successfully`);
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast.error('Failed to update approval status');
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

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
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Registration Requests</CardTitle>
              <FileText className="h-4 w-4 ml-auto text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
              <p className="text-xs text-gray-500">Total requests received</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/course-approval')}
          >
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Course Approval</CardTitle>
              <BookOpen className="h-4 w-4 ml-auto text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">Manage</div>
              <p className="text-xs text-gray-500">Review and approve courses</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Active Users</CardTitle>
              <Users className="h-4 w-4 ml-auto text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">-</div>
              <p className="text-xs text-gray-500">Currently active</p>
            </CardContent>
          </Card>
        </div>

        {/* Registration Requests Table */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Registration Requests</CardTitle>
            <CardDescription className="text-gray-600">
              Review and approve course registration requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading requests...</span>
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-700">Name</TableHead>
                      <TableHead className="text-gray-700">Phone</TableHead>
                      <TableHead className="text-gray-700">Topic</TableHead>
                      <TableHead className="text-gray-700">Language</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-gray-700">Created</TableHead>
                      <TableHead className="text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-32 text-gray-500">
                          No registration requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <TableRow key={request.request_id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{request.name}</TableCell>
                          <TableCell className="text-gray-600">{request.number}</TableCell>
                          <TableCell className="text-gray-600">{request.topic}</TableCell>
                          <TableCell className="text-gray-600">{request.language}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary"
                              className={`${
                                request.approval_status === 'approved' ? 'bg-green-500' :
                                request.approval_status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                              } text-white`}
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
                              onValueChange={(value: 'approved' | 'rejected' | 'pending') => 
                                updateApprovalStatus(request.request_id, value)
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
