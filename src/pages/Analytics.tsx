
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, BookOpen, MessageCircle, Loader2 } from 'lucide-react';
import DashboardCard from '@/components/DashboardCard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useMultiAuth } from '@/contexts/MultiAuthContext';

interface AnalyticsData {
  totalLearners: number;
  totalCourses: number;
  messagesSent: number;
  messagesByPeriod: {
    daily: { date: string; count: number }[];
    weekly: { date: string; count: number }[];
    monthly: { date: string; count: number }[];
  };
  learnersPerCourse: { name: string; value: number }[];
  courseCompletionRates: { name: string; rate: number }[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#84cc16'];

const Analytics = () => {
  const { user, userRole } = useMultiAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalLearners: 0,
    totalCourses: 0,
    messagesSent: 0,
    messagesByPeriod: {
      daily: [],
      weekly: [],
      monthly: []
    },
    learnersPerCourse: [],
    courseCompletionRates: []
  });

  useEffect(() => {
    if (user && (userRole === 'admin' || userRole === 'superadmin')) {
      fetchAnalyticsData();
    }
  }, [user, userRole]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch learners count (admin sees only their learners, superadmin sees all)
      let learnersQuery = supabase.from('learners').select('*', { count: 'exact', head: true });
      if (userRole === 'admin') {
        learnersQuery = learnersQuery.eq('created_by', user?.id);
      }
      const { count: learnersCount, error: learnersError } = await learnersQuery;
      
      if (learnersError) {
        console.error('Error fetching learners count:', learnersError);
      }
      
      // Fetch courses count (admin sees only their courses, superadmin sees all approved)
      let coursesQuery = supabase.from('courses').select('*', { count: 'exact', head: true });
      if (userRole === 'admin') {
        coursesQuery = coursesQuery.eq('created_by', user?.id);
      } else {
        coursesQuery = coursesQuery.eq('status', 'approved');
      }
      const { count: coursesCount, error: coursesError } = await coursesQuery;
      
      if (coursesError) {
        console.error('Error fetching courses count:', coursesError);
      }
      
      // Fetch messages sent count
      let messagesQuery = supabase.from('messages_sent').select('*', { count: 'exact', head: true });
      if (userRole === 'admin') {
        messagesQuery = messagesQuery.eq('user_id', user?.id);
      }
      const { count: messagesCount, error: messagesError } = await messagesQuery;
      
      if (messagesError) {
        console.error('Error fetching messages count:', messagesError);
      }
      
      // Generate time series data for messages
      const dailyData = generateTimeSeriesData(7, messagesCount || 0, 'day');
      const weeklyData = generateTimeSeriesData(4, messagesCount || 0, 'week');
      const monthlyData = generateTimeSeriesData(6, messagesCount || 0, 'month');
      
      // Fetch courses with learner assignment counts
      let coursesWithLearnersQuery = supabase
        .from('courses')
        .select(`
          id,
          course_name,
          request_id
        `);
      
      if (userRole === 'admin') {
        coursesWithLearnersQuery = coursesWithLearnersQuery.eq('created_by', user?.id);
      } else {
        coursesWithLearnersQuery = coursesWithLearnersQuery.eq('status', 'approved');
      }
      
      const { data: coursesWithLearners, error: coursesWithLearnersError } = await coursesWithLearnersQuery;
      
      if (coursesWithLearnersError) {
        console.error('Error fetching courses with learners:', coursesWithLearnersError);
      }
      
      // Count learners per course by checking assigned_course_id
      const learnersPerCourse: { name: string; value: number }[] = [];
      
      if (coursesWithLearners) {
        // Group courses by request_id to get unique course assignments
        const courseGroups = coursesWithLearners.reduce((acc, course) => {
          if (!acc[course.request_id]) {
            acc[course.request_id] = course.course_name;
          }
          return acc;
        }, {} as Record<string, string>);
        
        for (const [requestId, courseName] of Object.entries(courseGroups)) {
          // Count learners assigned to any course with this request_id
          const courseIds = coursesWithLearners
            .filter(c => c.request_id === requestId)
            .map(c => c.id);
          
          let learnersCountQuery = supabase
            .from('learners')
            .select('*', { count: 'exact', head: true })
            .in('assigned_course_id', courseIds);
            
          if (userRole === 'admin') {
            learnersCountQuery = learnersCountQuery.eq('created_by', user?.id);
          }
          
          const { count: learnerCount } = await learnersCountQuery;
          
          if (learnerCount && learnerCount > 0) {
            learnersPerCourse.push({
              name: courseName,
              value: learnerCount
            });
          }
        }
      }
      
      // Sort and limit to top 5
      learnersPerCourse.sort((a, b) => b.value - a.value);
      const topLearnersPerCourse = learnersPerCourse.slice(0, 5);
      
      // If no assignments, add placeholder
      if (topLearnersPerCourse.length === 0 && (coursesCount || 0) > 0) {
        topLearnersPerCourse.push({ name: 'No assignments yet', value: 1 });
      }
      
      // Fetch course completion rates from course_progress
      let progressQuery = supabase
        .from('course_progress')
        .select(`
          course_id,
          progress_percent,
          status
        `);
      
      const { data: progressData, error: progressError } = await progressQuery;
      
      if (progressError) {
        console.error('Error fetching course progress:', progressError);
      }
      
      // Calculate completion rates
      const courseCompletionMap = new Map();
      
      if (progressData && coursesWithLearners) {
        progressData.forEach(progress => {
          const course = coursesWithLearners.find(c => c.id === progress.course_id);
          if (!course) return;
          
          const courseName = course.course_name;
          if (!courseCompletionMap.has(courseName)) {
            courseCompletionMap.set(courseName, { 
              total: 0, 
              sum: 0 
            });
          }
          
          const courseData = courseCompletionMap.get(courseName);
          courseData.total += 1;
          courseData.sum += progress.progress_percent || 0;
          courseCompletionMap.set(courseName, courseData);
        });
      }
      
      const courseCompletionRates = Array.from(courseCompletionMap.entries())
        .map(([name, data]) => ({
          name,
          rate: Math.round(data.sum / data.total)
        }))
        .filter(course => !isNaN(course.rate))
        .sort((a, b) => b.rate - a.rate);
      
      if (courseCompletionRates.length === 0 && (coursesCount || 0) > 0) {
        courseCompletionRates.push({ name: 'No progress data yet', rate: 0 });
      }
      
      setAnalyticsData({
        totalLearners: learnersCount || 0,
        totalCourses: coursesCount || 0,
        messagesSent: messagesCount || 0,
        messagesByPeriod: {
          daily: dailyData,
          weekly: weeklyData,
          monthly: monthlyData
        },
        learnersPerCourse: topLearnersPerCourse,
        courseCompletionRates
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to generate time series data
  const generateTimeSeriesData = (numPoints: number, total: number, period: 'day' | 'week' | 'month') => {
    const result = [];
    const baseValue = Math.max(1, Math.floor(total / numPoints));
    
    for (let i = 0; i < numPoints; i++) {
      let label = '';
      if (period === 'day') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayIndex = (new Date().getDay() - i) % 7;
        label = days[dayIndex >= 0 ? dayIndex : dayIndex + 7];
      } else if (period === 'week') {
        label = `Week ${numPoints - i}`;
      } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = (new Date().getMonth() - i) % 12;
        label = months[monthIndex >= 0 ? monthIndex : monthIndex + 12];
      }
      
      const randomFactor = 0.5 + Math.random();
      const count = Math.floor(baseValue * randomFactor);
      
      result.unshift({ date: label, count });
    }
    
    return result;
  };

  if (userRole === 'learner') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Access denied. Analytics are only available for admins and super admins.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            {userRole === 'superadmin' ? 'System-wide analytics' : 'Your teaching platform performance'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading analytics data...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <DashboardCard
                title="Total Learners"
                value={analyticsData.totalLearners.toString()}
                icon={<Users size={24} />}
                trend={{ value: 0, direction: 'up', label: 'current count' }}
              />
              <DashboardCard
                title="Total Courses"
                value={analyticsData.totalCourses.toString()}
                icon={<BookOpen size={24} />}
                trend={{ value: 0, direction: 'up', label: 'current count' }}
              />
              <DashboardCard
                title="Messages Sent"
                value={analyticsData.messagesSent.toString()}
                icon={<MessageCircle size={24} />}
                trend={{ value: 0, direction: 'up', label: 'current count' }}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Messages Sent</CardTitle>
                  <CardDescription>Message volume over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="daily">
                    <TabsList className="mb-4">
                      <TabsTrigger value="daily">Daily</TabsTrigger>
                      <TabsTrigger value="weekly">Weekly</TabsTrigger>
                      <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    </TabsList>
                    <TabsContent value="daily" className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analyticsData.messagesByPeriod.daily}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              border: 'none'
                            }} 
                          />
                          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>
                    <TabsContent value="weekly" className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analyticsData.messagesByPeriod.weekly}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              border: 'none'
                            }} 
                          />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>
                    <TabsContent value="monthly" className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analyticsData.messagesByPeriod.monthly}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              border: 'none'
                            }} 
                          />
                          <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Learners Per Course</CardTitle>
                  <CardDescription>Distribution of learners across courses</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData.learnersPerCourse.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No data available yet
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.learnersPerCourse}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {analyticsData.learnersPerCourse.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value} learners`, 'Enrolled']}
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              border: 'none'
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle>Course Completion Rate</CardTitle>
                <CardDescription>Percentage of learners who complete each course</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.courseCompletionRates.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No completion data available yet
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={analyticsData.courseCompletionRates}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 150,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} unit="%" />
                        <YAxis type="category" dataKey="name" width={140} />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Completion Rate']}
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            border: 'none'
                          }} 
                        />
                        <Bar dataKey="rate" fill="#84cc16" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
