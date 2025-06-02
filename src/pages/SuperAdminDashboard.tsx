
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { supabase } from '@/integrations/supabase/client';
import { RegistrationRequest } from '@/lib/types';

const SuperAdminDashboard = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) return;
    
    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('registration_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Type assertion to ensure proper typing
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

    fetchRequests();
  }, [isSuperAdmin]);

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

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Access denied</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage registration requests and system settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration Requests</CardTitle>
          <CardDescription>
            Review and approve course registration requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading requests...</span>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                        No registration requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.request_id}>
                        <TableCell className="font-medium">{request.name}</TableCell>
                        <TableCell>{request.number}</TableCell>
                        <TableCell>{request.topic}</TableCell>
                        <TableCell>{request.language}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              request.approval_status === 'approved' ? 'default' :
                              request.approval_status === 'rejected' ? 'destructive' : 'secondary'
                            }
                          >
                            {request.approval_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
  );
};

export default SuperAdminDashboard;
