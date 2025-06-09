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
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#84cc16', '#facc15', '#f472b6', '#60a5fa'];

const Analytics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [totalLearners, setTotalLearners] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [learnersPerCourse, setLearnersPerCourse] = useState<{ name: string, value: number }[]>([]);
  const [courseCompletionRates, setCourseCompletionRates] = useState<{ name: string, rate: number }[]>([]);
  const [coursesByLanguage, setCoursesByLanguage] = useState<{ language: string, value: number }[]>([]);
  const [learnersByStatus, setLearnersByStatus] = useState<{ status: string, value: number }[]>([]);
  const [coursesByDay, setCoursesByDay] = useState<{ day: number, value: number }[]>([]);
  const [languagesCount, setLanguagesCount] = useState(0);
  const [languagesPie, setLanguagesPie] = useState<{ language: string, value: number }[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);

      // Total learners
      const { count: learnersCount, data: learnersData } = await supabase
        .from('learners')
        .select('*', { count: 'exact', head: false });
      setTotalLearners(learnersCount || 0);

      // Learners by status (active/inactive)
      const statusMap = new Map();
      learnersData?.forEach(row => {
        const status = row.status || 'unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      setLearnersByStatus(Array.from(statusMap.entries()).map(([status, value]) => ({ status, value })));

      // Total courses
      const { count: coursesCount, data: coursesData } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: false });
      setTotalCourses(coursesCount || 0);

      // Courses by day (distribution)
      const dayMap = new Map();
      coursesData?.forEach(row => {
        const day = row.day || 1;
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      });
      setCoursesByDay(Array.from(dayMap.entries()).map(([day, value]) => ({ day, value })));

      // Learners per course
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
      setLearnersPerCourse(Array.from(learnersPerCourseMap.entries()).map(([name, value]) => ({ name, value })));

      // Course completion rates
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
      setCourseCompletionRates(Array.from(completionMap.entries()).map(([name, { total, completed }]) => ({
        name,
        rate: total ? Math.round((completed / total) * 100) : 0,
      })));

      // Courses by language (join courses.request_id = registration_requests.request_id)
      const { data: coursesWithLang } = await supabase
        .from('courses')
        .select('request_id');
      const requestIds = coursesWithLang?.map(c => c.request_id).filter(Boolean);

      let languageMap = new Map();
      if (requestIds && requestIds.length > 0) {
        const { data: regRequests } = await supabase
          .from('registration_requests')
          .select('request_id, language')
          .in('request_id', requestIds);

        regRequests?.forEach(row => {
          const lang = row.language || 'Unknown';
          languageMap.set(lang, (languageMap.get(lang) || 0) + 1);
        });
      }
      setCoursesByLanguage(Array.from(languageMap.entries()).map(([language, value]) => ({ language, value })));

      // Fetch languages from registration_requests (FIXED LOGIC)
      const { data: regRequests, error: langError } = await supabase
        .from('registration_requests')
        .select('language');

        console.log(regRequests);
        console.log(langError);
        
        

      if (langError) {
        setLanguagesCount(0);
        setLanguagesPie([]);
      } else if (regRequests && regRequests.length > 0) {
        // Count unique languages and their occurrences
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

      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

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
                value={totalLearners.toString()}
                icon={<Users size={24} />}
              />
              <DashboardCard
                title="Total Courses"
                value={totalCourses.toString()}
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
                  {learnersPerCourse.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-gray-400">
                      No data available yet
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={learnersPerCourse}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {learnersPerCourse.map((entry, index) => (
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Learners by Status Bar */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Learners by Status</CardTitle>
                  <CardDescription className="text-gray-600">Active vs Inactive Learners</CardDescription>
                </CardHeader>
                <CardContent>
                  {learnersByStatus.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-gray-400">
                      No data available yet
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={learnersByStatus}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="status" />
                          <YAxis allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              border: 'none',
                              color: '#111827'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Courses by Day Bar */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Courses by Day</CardTitle>
                  <CardDescription className="text-gray-600">Distribution of courses by day count</CardDescription>
                </CardHeader>
                <CardContent>
                  {coursesByDay.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-gray-400">
                      No data available yet
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={coursesByDay}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="day" />
                          <YAxis allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              border: 'none',
                              color: '#111827'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
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
                {courseCompletionRates.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    No completion data available yet
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={courseCompletionRates}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="rate"
                          label={({ name, rate }) => `${name} ${rate}%`}
                        >
                          {courseCompletionRates.map((entry, index) => (
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
