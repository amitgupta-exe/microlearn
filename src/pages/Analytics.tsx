import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Loader2, Languages } from 'lucide-react';
import DashboardCard from '@/components/DashboardCard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
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

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#84cc16', '#facc15', '#f472b6', '#60a5fa'];

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
  const [languagesCount, setLanguagesCount] = useState(0);
  const [languagesPie, setLanguagesPie] = useState<{ language: string, value: number }[]>([]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);

      // Fetch total learners
      const { count: learnersCount } = await supabase
        .from('learners')
        .select('*', { count: 'exact', head: true });

      // Fetch total courses (unique request_id)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('request_id');
      if (coursesError) throw coursesError;
      const uniqueRequestIds = new Set((coursesData || []).map((course: any) => course.request_id));
      const coursesCount = uniqueRequestIds.size;

      // Fetch learners per course
      const { data: learnersPerCourseRaw } = await supabase
        .from('course_progress')
        .select('course_id, course_name');
      const learnersPerCourseMap = new Map();
      learnersPerCourseRaw?.forEach(row => {
        if (!learnersPerCourseMap.has(row.course_name)) {
          learnersPerCourseMap.set(row.course_name, 0);
        }
        learnersPerCourseMap.set(row.course_name, learnersPerCourseMap.get(row.course_name) + 1);
      });
      const learnersPerCourse = Array.from(learnersPerCourseMap.entries()).map(([name, value]) => ({ name, value }));

      // Fetch course completion rates
      const { data: courseProgress } = await supabase
        .from('course_progress')
        .select('course_name, status');
      const completionMap = new Map();
      courseProgress?.forEach(row => {
        if (!completionMap.has(row.course_name)) {
          completionMap.set(row.course_name, { total: 0, completed: 0 });
        }
        const entry = completionMap.get(row.course_name);
        entry.total += 1;
        if (row.status === 'completed') entry.completed += 1;
        completionMap.set(row.course_name, entry);
      });
      const courseCompletionRates = Array.from(completionMap.entries()).map(([name, { total, completed }]) => ({
        name,
        rate: total ? Math.round((completed / total) * 100) : 0,
      }));

      // Fetch languages from registration_requests
      const { data: regRequests, error: langError } = await supabase
        .from('registration_requests')
        .select('language');
      if (!langError && regRequests && regRequests.length > 0) {
        const langMap = new Map<string, number>();
        regRequests.forEach(row => {
          const lang = (row.language || 'Unknown').trim();
          langMap.set(lang, (langMap.get(lang) || 0) + 1);
        });
        setLanguagesCount(langMap.size);
        setLanguagesPie(Array.from(langMap.entries()).map(([language, value]) => ({ language, value })));
      } else {
        setLanguagesCount(0);
        setLanguagesPie([]);
      }

      setAnalyticsData({
        totalLearners: learnersCount || 0,
        totalCourses: coursesCount,
        messagesSent: 0, // Update if you have messages logic
        messagesByPeriod: {
          daily: [],
          weekly: [],
          monthly: []
        },
        learnersPerCourse,
        courseCompletionRates
      });

      setIsLoading(false);
    };

    fetchAnalyticsData();
  }, []);

  if (userRole === 'learner') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Access denied. Analytics are only available for admins and super admins.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-6 px-6 md:px-8 bg-gray-100 page-transition">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Track your teaching platform performance</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-gray-600">Loading analytics data...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <DashboardCard
                title="Total Learners"
                value={analyticsData.totalLearners.toString()}
                icon={<Users size={24} />}
              />
              <DashboardCard
                title="Total Courses"
                value={analyticsData.totalCourses.toString()}
                icon={<BookOpen size={24} />}
              />
              <DashboardCard
                title="Languages"
                value={languagesCount.toString()}
                icon={<Languages size={24} />}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Learners Per Course Pie */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Learners Per Course</CardTitle>
                  <CardDescription className="text-gray-600">Distribution of learners across courses</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData.learnersPerCourse.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-gray-400">
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
                              border: 'none',
                              color: '#111827'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Languages Pie */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Languages Distribution</CardTitle>
                  <CardDescription className="text-gray-600">Proportion of languages in registration requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {languagesPie.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-gray-400">
                      No data available yet
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={languagesPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="language"
                            label={({ language, percent }) => `${language} ${(percent * 100).toFixed(0)}%`}
                          >
                            {languagesPie.map((entry, index) => (
                              <Cell key={`cell-lang-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [`${value} requests`, 'Requests']}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              border: 'none',
                              color: '#111827'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Course Completion Rate Pie */}
            <Card className="bg-white border border-gray-200 mb-6">
              <CardHeader>
                <CardTitle className="text-gray-900">Course Completion Rate</CardTitle>
                <CardDescription className="text-gray-600">Percentage of learners who complete each course</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.courseCompletionRates.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    No completion data available yet
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.courseCompletionRates}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="rate"
                          label={({ name, rate }) => `${name} ${rate}%`}
                        >
                          {analyticsData.courseCompletionRates.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${value}%`, 'Completion Rate']}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            border: 'none',
                            color: '#111827'
                          }}
                        />
                      </PieChart>
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
