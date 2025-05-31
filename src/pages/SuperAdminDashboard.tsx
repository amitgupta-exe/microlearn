
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { useNavigate } from 'react-router-dom';
import { RegistrationRequest } from '@/lib/types';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useSuperAdmin();
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

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to fetch registration requests');
    } finally {
      setLoading(false);
    }
  };

  const updateApprovalStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('registration_requests')
        .update({ approval_status: status })
        .eq('request_id', requestId);

      if (error) throw error;

      setRequests(prev => 
        prev.map(req => 
          req.request_id === requestId 
            ? { ...req, approval_status: status }
            : req
        )
      );

      toast.success(`Request ${status} successfully`);
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast.error('Failed to update approval status');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/superadmin/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Registration Requests</h1>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Style</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.request_id}>
                  <TableCell className="font-medium">{request.name}</TableCell>
                  <TableCell>{request.number}</TableCell>
                  <TableCell>{request.language}</TableCell>
                  <TableCell>{request.topic}</TableCell>
                  <TableCell>{request.style}</TableCell>
                  <TableCell className="max-w-xs truncate">{request.goal}</TableCell>
                  <TableCell>{request.generated ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.approval_status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : request.approval_status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {request.approval_status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={request.approval_status}
                      onValueChange={(value: 'approved' | 'rejected') =>
                        updateApprovalStatus(request.request_id, value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approve</SelectItem>
                        <SelectItem value="rejected">Reject</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {requests.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No registration requests found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
