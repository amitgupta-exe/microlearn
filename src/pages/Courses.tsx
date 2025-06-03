import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreHorizontal,
  ArrowLeft,
  Eye,
  Archive,
  Edit,
  Trash2,
  BookOpen,
  Users,
  Globe,
  Lock,
  MessageSquareText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CourseForm from '@/components/CourseForm';
// import CoursePromptForm from '@/components/CoursePromptForm';
import CoursePreview from '@/components/CoursePreview';
import CourseDetailDialog from '@/components/CourseDetailDialog';
// import CourseAssignmentDialog from '@/components/CourseAssignmentDialog';
import AssignCourseToLearner from '@/components/AssignCourseToLearner';
import { Course } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Courses = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [courseGroups, setCourseGroups] = useState<{ [key: string]: Course[] }>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewCourses, setPreviewCourses] = useState<Course[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [assignCourses, setAssignCourses] = useState<Course[] | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [detailCourses, setDetailCourses] = useState<Course[] | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isNew = id === 'new';
  const isPrompt = id === 'prompt';
  const isEdit = id && id !== 'new' && id !== 'prompt';
  const showForm = isNew || isEdit;
  const showPromptForm = isPrompt;

  // Fetch courses from Supabase
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('course_name')
          .order('day');

        if (error) {
          throw error;
        }

        if (data) {
          // Group courses by request_id or course_name
          const grouped: { [key: string]: Course[] } = {};
          data.forEach((course) => {
            const key = course.request_id || course.course_name;
            if (!grouped[key]) {
              grouped[key] = [];
            }
            grouped[key].push(course as Course);
          });

          setCourseGroups(grouped);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast.error('Failed to load courses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  const handleCreateCourse = async (data: any) => {
    if (!user) {
      toast.error('You must be logged in to create a course');
      return;
    }

    try {
      const requestId = crypto.randomUUID();

      // Create 3 course entries for 3 days
      const courseEntries = [];
      for (let day = 1; day <= 3; day++) {
        const dayData = data.days[day - 1];
        courseEntries.push({
          course_name: data.course_name,
          day: day,
          module_1: dayData.module_1,
          module_2: dayData.module_2,
          module_3: dayData.module_3,
          visibility: "public",
          created_by: user.id,
          request_id: requestId,
          origin: 'microlearn_manual',
          created_at: new Date().toISOString()
        });
      }

      const { error } = await supabase
        .from('courses')
        .insert(courseEntries);

      if (error) throw error;

      navigate('/courses');
      toast.success('Course created successfully');

      // Refresh courses
      window.location.reload();
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast.error(`Failed to create course: ${error.message}`);
    }
  };

  const handleDeleteCourse = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('request_id', requestId);

      if (error) throw error;

      // Remove from local state
      const updatedGroups = { ...courseGroups };
      delete updatedGroups[requestId];
      setCourseGroups(updatedGroups);

      toast.success('Course deleted successfully');
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast.error(`Failed to delete course: ${error.message}`);
    }
  };



  const handleToggleVisibility = async (requestId: string) => {
    const courses = courseGroups[requestId];
    if (!courses) return;

    const newVisibility = courses[0].visibility === 'public' ? 'private' : 'public';

    try {
      const { error } = await supabase
        .from('courses')
        .update({ visibility: newVisibility })
        .eq('request_id', requestId);

      if (error) throw error;

      // Update local state
      const updatedGroups = { ...courseGroups };
      updatedGroups[requestId] = courses.map(course => ({
        ...course,
        visibility: newVisibility as 'public' | 'private'
      }));
      setCourseGroups(updatedGroups);

      toast.success(`Course is now ${newVisibility}`);
    } catch (error: any) {
      console.error(`Error changing course visibility:`, error);
      toast.error(`Failed to change course visibility: ${error.message}`);
    }
  };

  const handlePreviewCourse = (courses: Course[]) => {
    setPreviewCourses(courses);
    setShowPreview(true);
  };

  const handleAssignCourse = (courses: Course[]) => {
    setAssignCourses(courses);
    setShowAssignDialog(true);
  };

  const handleCourseCardClick = (courses: Course[]) => {
    setDetailCourses(courses);
    setShowDetailDialog(true);
  };

  const handlePromptSuccess = () => {
    navigate(`/courses`);
    window.location.reload();
  };

  // Apply filters
  let displayedGroups = Object.entries(courseGroups);

  if (visibilityFilter !== 'all') {
    displayedGroups = displayedGroups.filter(([_, courses]) =>
      courses[0].visibility === visibilityFilter
    );
  }

  // Filter by search query
  displayedGroups = displayedGroups.filter(([_, courses]) =>
    courses[0].course_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showForm) {
    return (
      <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate('/courses')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>

          <CourseForm
            onSubmit={handleCreateCourse}
            onCancel={() => navigate('/courses')}
          />
        </div>
      </div>
    );
  }

  if (showPromptForm) {
    return (
      <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate('/courses')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>

          {/* <CoursePromptForm
            onCancel={() => navigate('/courses')}
            onSuccess={handlePromptSuccess}
          /> */}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
            <p className="text-muted-foreground mt-1">
              Manage your course library
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            <Button variant="outline" onClick={() => navigate('/courses/prompt')}>
              <MessageSquareText className="mr-2 h-4 w-4" />
              Course On Prompt
            </Button>
            <Button onClick={() => navigate('/courses/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Course
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="mb-6" onValueChange={(value) => setVisibilityFilter(value as any)}>
          <TabsList>
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="private">My Courses</TabsTrigger>
            <TabsTrigger value="public">Public Courses</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="rounded-lg border bg-card mb-8">
          <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                className="pl-8 glass-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              {displayedGroups.length} courses
            </div>
          </div>
        </div>

        {/* Grid View of Course Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : displayedGroups.length === 0 ? (
            <div className="col-span-full flex justify-center items-center h-64 text-muted-foreground">
              {searchQuery ? 'No courses match your search' : 'No courses found'}
            </div>
          ) : (
            displayedGroups.map(([key, courses]) => (
              <Card
                key={key}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleCourseCardClick(courses)}
              >
                <div className="bg-gradient-to-r from-primary/15 to-primary/5 p-4 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <BookOpen size={14} />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewCourse(courses);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          WhatsApp Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(key);
                        }}>
                          {courses[0].visibility === 'public' ? (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Make Private
                            </>
                          ) : (
                            <>
                              <Globe className="h-4 w-4 mr-2" />
                              Make Public
                            </>
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCourse(courses[0]);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Assign to Learner
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(key);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-medium text-lg line-clamp-1">{courses[0].course_name}</h3>
                </div>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-4 line-clamp-2 h-10">
                    {courses.length} day course with modules
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{courses.length} days</span>
                    </div>
                    <div>
                      {courses[0].visibility === 'public' ? (
                        <div className="flex items-center gap-1">
                          <Globe size={12} className="text-green-500" />
                          <span>Public</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Lock size={12} className="text-gray-500" />
                          <span>Private</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <CoursePreview
        courses={previewCourses}
        open={showPreview}
        onOpenChange={setShowPreview}
      />

      <CourseDetailDialog
        courses={detailCourses}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
      />


      <AssignCourseToLearner
        course={selectedCourse}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssigned={() => {
          setAssignDialogOpen(false);
          setSelectedCourse(null);
          // Optionally refetch courses or learners here
        }}
      />
    </div>
  );
};

export default Courses;
