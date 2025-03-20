
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, BookOpen, MessageCircle } from 'lucide-react';
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

// Mock data
const DAILY_MESSAGES = [
  { date: 'Mon', count: 24 },
  { date: 'Tue', count: 18 },
  { date: 'Wed', count: 32 },
  { date: 'Thu', count: 27 },
  { date: 'Fri', count: 42 },
  { date: 'Sat', count: 15 },
  { date: 'Sun', count: 8 },
];

const LEARNERS_PER_COURSE = [
  { name: 'Python', value: 24 },
  { name: 'Marketing', value: 18 },
  { name: 'Web Design', value: 12 },
  { name: 'Business', value: 8 },
  { name: 'Other', value: 6 },
];

const WEEKLY_MESSAGES = [
  { date: 'Week 1', count: 120 },
  { date: 'Week 2', count: 145 },
  { date: 'Week 3', count: 132 },
  { date: 'Week 4', count: 160 },
];

const MONTHLY_MESSAGES = [
  { date: 'Jan', count: 420 },
  { date: 'Feb', count: 380 },
  { date: 'Mar', count: 520 },
  { date: 'Apr', count: 480 },
  { date: 'May', count: 560 },
  { date: 'Jun', count: 620 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#84cc16'];

const Analytics = () => {
  return (
    <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your teaching platform performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                      data={DAILY_MESSAGES}
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
                      data={WEEKLY_MESSAGES}
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
                      data={MONTHLY_MESSAGES}
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
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={LEARNERS_PER_COURSE}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {LEARNERS_PER_COURSE.map((entry, index) => (
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
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Course Completion Rate</CardTitle>
            <CardDescription>Percentage of learners who complete each course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={[
                    { name: 'Introduction to Python', rate: 78 },
                    { name: 'Digital Marketing', rate: 65 },
                    { name: 'Web Design Basics', rate: 82 },
                    { name: 'Business Leadership', rate: 45 },
                    { name: 'Data Analysis', rate: 60 },
                  ]}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
