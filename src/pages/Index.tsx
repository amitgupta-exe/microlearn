
import React from 'react';
import { Users, BookOpen, MessageCircle, ArrowRight, Plus } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const MOCK_COURSES = [
  {
    id: '1',
    name: 'Introduction to Python',
    category: 'Programming',
    learners: 24,
    status: 'active',
  },
  {
    id: '2',
    name: 'Digital Marketing Fundamentals',
    category: 'Marketing',
    learners: 18,
    status: 'active',
  },
  {
    id: '3',
    name: 'Web Design Basics',
    category: 'Design',
    learners: 12,
    status: 'active',
  },
];

const Index = () => {
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <DashboardCard
            title="Total Learners"
            value="54"
            icon={<Users size={24} />}
            trend={{ value: 12, direction: 'up', label: 'vs last month' }}
          />
          <DashboardCard
            title="Active Courses"
            value="8"
            icon={<BookOpen size={24} />}
            trend={{ value: 3, direction: 'up', label: 'vs last month' }}
          />
          <DashboardCard
            title="Messages Sent"
            value="346"
            icon={<MessageCircle size={24} />}
            trend={{ value: 5, direction: 'up', label: 'vs last month' }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card lg:col-span-2 animate-float">
            <CardHeader>
              <CardTitle>Recent Courses</CardTitle>
              <CardDescription>Your most recently created courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_COURSES.map((course) => (
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
      </div>
    </div>
  );
};

export default Index;
