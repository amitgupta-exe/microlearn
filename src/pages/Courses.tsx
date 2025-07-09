
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
import CoursePromptForm from '@/components/CoursePromptForm';
import CoursePreview from '@/components/CoursePreview';
import CourseDetailDialog from '@/components/CourseDetailDialog';
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

  console.log('Courses page - user:', user, 'current route:', id);

  // Fetch courses from Supabase
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) {
        console.log('No user found, skipping course fetch');
        return;
      }

      console.log('Fetching courses for user:', user.id);
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

        console.log('Raw courses data:', data);

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

          console.log('Grouped courses:', grouped);
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

    console.log('Creating course with data:', data);

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
          origin: data.origin || 'microlearn_manual',
          created_at: new Date().toISOString()
        });
      }

      console.log('Course entries to insert:', courseEntries);

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
    console.log('Deleting course with requestId:', requestId);
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

    console.log('Toggling visibility for course:', requestId, 'to:', newVisibility);

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
    console.log('Opening assign dialog for courses:', courses);
    setSelectedCourse(courses[0]); // Use the first course for assignment
    setAssignDialogOpen(true);
  };

  // Find the group for the current id (for detail/edit)
  const currentGroup = id && courseGroups[id] ? courseGroups[id] : null;

  // Card click navigates to detail page
  const handleCourseCardClick = (courses: Course[]) => {
    if (courses[0].request_id) {
      navigate(`/courses/${courses[0].request_id}`);
    } else {
      setDetailCourses(courses);
      setShowDetailDialog(true);
    }
  };

  // Edit handler
  const handleEditCourse = (courses: Course[]) => {
    if (courses[0].request_id) {
      navigate(`/courses/${courses[0].request_id}?edit=1`);
    }
  };

  // Show edit form if on /courses/:id?edit=1
  const isEditMode = !!(id && new URLSearchParams(window.location.search).get('edit'));

  if (isEditMode && currentGroup) {
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

  // Show detail dialog if on /courses/:id and not editing
  if (id && currentGroup && !isEditMode) {
    return (
      <CourseDetailDialog
        courses={currentGroup}
        open={true}
        onOpenChange={() => navigate('/courses')}
      />
    );
  }

  // Apply filters with improved logic
  let displayedGroups = Object.entries(courseGroups);

  console.log('Applying filter:', visibilityFilter, 'user id:', user?.id);

  if (visibilityFilter === 'private') {
    // Show only courses created by current user (both public and private)
    displayedGroups = displayedGroups.filter(([_, courses]) =>
      courses[0].created_by === user?.id
    );
  } else if (visibilityFilter === 'public') {
    // Show all public courses
    displayedGroups = displayedGroups.filter(([_, courses]) =>
      courses[0].visibility === 'public'
    );
  }
  // For 'all', show everything

  console.log('Filtered course groups:', displayedGroups.length);

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

          <CoursePromptForm
            onCancel={() => navigate('/courses')}
            onSuccess={() => {
              navigate('/courses');
              window.location.reload();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-6 px-6 md:px-8 bg-gray-100 page-transition">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Courses</h1>
            <p className="text-gray-600 mt-1">
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

        <div className="rounded-lg border border-gray-200 bg-white mb-8">
          <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search courses..."
                className="pl-8 bg-white text-gray-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              {displayedGroups.length} unique courses
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
            <div className="col-span-full flex justify-center items-center h-64 text-gray-400">
              {searchQuery ? 'No courses match your search' : 'No courses found'}
            </div>
          ) : (
            displayedGroups.map(([key, courses]) => (
              <Card
                key={key}
                className="overflow-hidden bg-white cursor-pointer hover:shadow-lg transition-shadow border border-gray-200"
                onClick={() => handleCourseCardClick(courses)}
              >
                <div className="bg-gray-50 p-4 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <BookOpen size={14} />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignCourse(courses);
                          }}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Assign to Learners
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
                            handleEditCourse(courses);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
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
                  <h3 className="font-medium text-lg line-clamp-1 text-gray-900">{courses[0].course_name}</h3>
                </div>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-4 line-clamp-2 h-10">
                    {courses.length} day course with modules • Origin: {courses[0].origin}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
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
          toast.success('Course assignment completed');
        }}
      />
    </div>
  );
};

export default Courses;
