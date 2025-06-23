
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Eye, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Course } from '@/lib/types';
import { useNavigate } from 'react-router-dom';

interface GroupedCourse {
  request_id: string;
  course_name: string;
  status: string;
  created_at: string;
  modules: Course[];
}

const CourseApproval = () => {
  const [groupedCourses, setGroupedCourses] = useState<GroupedCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<GroupedCourse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      console.log('Fetching courses for approval...');
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching courses:', error);
        throw error;
      }

      console.log('Fetched courses data:', data);

      // Group courses by request_id
      const grouped = data?.reduce((acc: { [key: string]: GroupedCourse }, course: Course) => {
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
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCourseStatus = async (requestId: string, status: 'pending' | 'approved' | 'rejected') => {
    try {
      console.log('Updating course status:', requestId, 'to:', status);
      
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
    } catch (error) {
      console.error('Error updating course status:', error);
      toast.error('Failed to update course status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/superadmin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Course Approval</h1>
            <p className="text-gray-600">Review and approve course requests</p>
          </div>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Course Requests</CardTitle>
            <CardDescription className="text-gray-600">
              Manage course approval status and view module details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading courses...</span>
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-700">Request ID</TableHead>
                      <TableHead className="text-gray-700">Course Name</TableHead>
                      <TableHead className="text-gray-700">Modules</TableHead>
                      <TableHead className="text-gray-700">Status</TableHead>
                      <TableHead className="text-gray-700">Created</TableHead>
                      <TableHead className="text-gray-700">Actions</TableHead>
                      <TableHead className="text-gray-700">View Details</TableHead>
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
                        <TableRow key={course.request_id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm text-gray-600">
                            {course.request_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {course.course_name}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {course.modules.length} modules
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary"
                              className={`${getStatusColor(course.status)} text-white`}
                            >
                              {course.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
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
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedCourse(course)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
                                <DialogHeader>
                                  <DialogTitle className="text-gray-900">{course.course_name}</DialogTitle>
                                  <DialogDescription className="text-gray-600">
                                    Course modules and content details
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6">
                                  {course.modules.map((module, index) => (
                                    <Card key={module.id} className="border border-gray-200">
                                      <CardHeader>
                                        <CardTitle className="text-lg text-gray-900">
                                          Day {module.day} - Module {index + 1}
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        {module.module_1 && (
                                          <div>
                                            <h4 className="font-medium text-gray-700 mb-2">Module 1:</h4>
                                            <p className="text-gray-600 whitespace-pre-wrap">{module.module_1}</p>
                                          </div>
                                        )}
                                        {module.module_2 && (
                                          <div>
                                            <h4 className="font-medium text-gray-700 mb-2">Module 2:</h4>
                                            <p className="text-gray-600 whitespace-pre-wrap">{module.module_2}</p>
                                          </div>
                                        )}
                                        {module.module_3 && (
                                          <div>
                                            <h4 className="font-medium text-gray-700 mb-2">Module 3:</h4>
                                            <p className="text-gray-600 whitespace-pre-wrap">{module.module_3}</p>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
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

export default CourseApproval;
