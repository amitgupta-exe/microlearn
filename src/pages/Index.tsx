
import React, { useState, useEffect } from 'react';
import { Users, BookOpen, MessageCircle, ArrowRight, Plus, Loader2 } from 'lucide-react';
import DashboardCard from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Course } from '@/lib/types';
import { cn } from '@/lib/utils';

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalLearners: 0,
    activeCourses: 0,
    messagesSent: 0,
    recentCourses: [] as Course[]
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch total learners count
        const { count: learnersCount, error: learnersError } = await supabase
          .from('learners')
          .select('*', { count: 'exact', head: true });
          
        if (learnersError) {
          console.error('Error fetching learners count:', learnersError);
        }
        
        // Fetch active courses count
        const { count: coursesCount, error: coursesError } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
          
        if (coursesError) {
          console.error('Error fetching courses count:', coursesError);
        }
        
        // Fetch messages count
        const { count: messagesCount, error: messagesError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true });
          
        if (messagesError) {
          console.error('Error fetching messages count:', messagesError);
        }
        
        // Fetch recent courses
        const { data: recentCoursesData, error: recentCoursesError } = await supabase
          .from('courses')
          .select(`
            *,
            learner_courses:learner_courses(learner_id)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (recentCoursesError) {
          console.error('Error fetching recent courses:', recentCoursesError);
        }
        
        // Process the recent courses data to count learners
        const recentCourses = recentCoursesData ? recentCoursesData.map(course => ({
          ...course,
          days: [],
          status: course.status as 'active' | 'archived' | 'draft',
          learners: Array.isArray(course.learner_courses) ? course.learner_courses.length : 0
        })) : [];
        
        setDashboardData({
          totalLearners: learnersCount || 0,
          activeCourses: coursesCount || 0,
          messagesSent: messagesCount || 0,
          recentCourses
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome to your teaching platform</p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <Button asChild>
              <Link to="/courses/new">
                <Plus className="mr-1 h-4 w-4" />
                New Course
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/learners/new">
                <Plus className="mr-1 h-4 w-4" />
                New Learner
              </Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading dashboard data...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <DashboardCard
                title="Total Learners"
                value={dashboardData.totalLearners.toString()}
                icon={<Users size={24} />}
                trend={{ value: 0, direction: 'up', label: 'current count' }}
              />
              <DashboardCard
                title="Active Courses"
                value={dashboardData.activeCourses.toString()}
                icon={<BookOpen size={24} />}
                trend={{ value: 0, direction: 'up', label: 'current count' }}
              />
              <DashboardCard
                title="Messages Sent"
                value={dashboardData.messagesSent.toString()}
                icon={<MessageCircle size={24} />}
                trend={{ value: 0, direction: 'up', label: 'current count' }}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="glass-card lg:col-span-2 animate-float">
                <CardHeader>
                  <CardTitle>Recent Courses</CardTitle>
                  <CardDescription>Your most recently created courses</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData.recentCourses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No courses created yet</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        asChild
                      >
                        <Link to="/courses/new">
                          <Plus className="mr-2 h-4 w-4" />
                          Create a course
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.recentCourses.map((course) => (
                        <div
                          key={course.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div>
                            <p className="font-medium">{course.name}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                                {course.category}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {course.learners} learners
                              </span>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={`/courses/${course.id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 text-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/courses">
                        View all courses
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card animate-float">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks you can perform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" asChild>
                      <Link to="/courses/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Course
                      </Link>
                    </Button>
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link to="/learners/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Learner
                      </Link>
                    </Button>
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link to="/whatsapp">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Configure WhatsApp
                      </Link>
                    </Button>
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link to="/analytics">
                        <ArrowRight className="mr-2 h-4 w-4" />
                        View Analytics
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
