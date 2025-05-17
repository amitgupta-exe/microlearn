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
  MessageSquareText,
  PenLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CourseForm from '@/components/CourseForm';
import CoursePromptForm from '@/components/CoursePromptForm';
import CoursePreview from '@/components/CoursePreview';
import CourseAssignmentDialog from '@/components/CourseAssignmentDialog';
import { Course, AlfredCourseData } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Courses = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [alfredCourses, setAlfredCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [assignCourse, setAssignCourse] = useState<Course | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isNew = id === 'new';
  const isPrompt = id === 'prompt';
  const isEdit = id && id !== 'new' && id !== 'prompt';
  const showForm = isNew || isEdit;
  const showPromptForm = isPrompt;
  
  const currentCourse = isEdit 
    ? courses.find(course => course.id === id) 
    : undefined;
  
  // Fetch courses from Supabase
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Fetch regular courses
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            days:course_days(*)
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        if (data) {
          // Transform the data to match our Course type
          const transformedCourses: Course[] = data.map(course => ({
            id: course.id,
            name: course.name,
            description: course.description,
            category: course.category,
            language: course.language,
            days: course.days.map((day: any) => ({
              id: day.id,
              day_number: day.day_number,
              title: day.title,
              info: day.info,
              media_link: day.media_link || undefined,
              module_1: day.module_1 || '',
              module_2: day.module_2 || '',
              module_3: day.module_3 || ''
            })),
            created_at: course.created_at,
            status: course.status as 'active' | 'archived' | 'draft',
            visibility: course.visibility as 'public' | 'private'
          }));
          
          setCourses(transformedCourses);
        }

        // Fetch alfred course data
        const { data: alfredData, error: alfredError } = await supabase
          .from('alfred_course_data')
          .select('*')
          .order('course_name')
          .order('day');
        
        if (alfredError) {
          console.error('Error fetching alfred course data:', alfredError);
        } else if (alfredData) {
          // Process the alfred course data to group by course name
          const courseMap = new Map<string, any[]>();
          
          alfredData.forEach((item: AlfredCourseData) => {
            if (!courseMap.has(item.course_name)) {
              courseMap.set(item.course_name, []);
            }
            courseMap.get(item.course_name)?.push(item);
          });

          // Transform the grouped data into proper Course objects
          const alfredCourses: Course[] = Array.from(courseMap.entries()).map(([courseName, days]) => {
            // Take the first day for course info
            const firstDay = days[0];
            
            return {
              id: `alfred-${courseName.replace(/\s+/g, '-').toLowerCase()}`,
              name: courseName,
              description: `${courseName} - Alfred generated course`,
              category: 'Alfred Course',
              language: 'English',
              days: days.map(day => ({
                id: day.id,
                day_number: day.day,
                title: `Day ${day.day}`,
                info: day.module_1_text || '',
                module_1: day.module_1_text || '',
                module_2: day.module_2_text || '',
                module_3: day.module_3_text || '',
              })),
              created_at: firstDay.created_at,
              status: 'active' as const,
              visibility: 'public' as const
            };
          });

          setAlfredCourses(alfredCourses);
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
      // Insert new course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          name: data.name,
          description: data.description,
          category: data.category,
          language: data.language,
          status: 'active',
          created_by: user.id,
          visibility: 'private' // Default to private
        })
        .select()
        .single();
      
      if (courseError) throw courseError;
      
      // Insert course days
      const daysToInsert = data.days.map((day: any, index: number) => ({
        course_id: courseData.id,
        day_number: index + 1,
        title: day.title,
        info: day.info,
        media_link: day.media_link || null,
      }));
      
      const { data: daysData, error: daysError } = await supabase
        .from('course_days')
        .insert(daysToInsert)
        .select();
      
      if (daysError) throw daysError;
      
      // Format the new course to match our Course type
      const newCourse: Course = {
        id: courseData.id,
        name: courseData.name,
        description: courseData.description,
        category: courseData.category,
        language: courseData.language,
        days: daysData.map((day: any) => ({
          id: day.id,
          day_number: day.day_number,
          title: day.title,
          info: day.info,
          media_link: day.media_link || undefined,
        })),
        created_at: courseData.created_at,
        status: courseData.status as 'active' | 'archived' | 'draft',
        visibility: courseData.visibility as 'public' | 'private'
      };
      
      setCourses([newCourse, ...courses]);
      navigate('/courses');
      toast.success('Course created successfully');
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast.error(`Failed to create course: ${error.message}`);
    }
  };
  
  const handleUpdateCourse = async (data: any) => {
    if (!user || !currentCourse) {
      toast.error('You must be logged in to update a course');
      return;
    }
    
    try {
      // Update course
      const { error: courseError } = await supabase
        .from('courses')
        .update({
          name: data.name,
          description: data.description,
          category: data.category,
          language: data.language,
        })
        .eq('id', currentCourse.id);
      
      if (courseError) throw courseError;
      
      // Delete existing days
      const { error: deleteError } = await supabase
        .from('course_days')
        .delete()
        .eq('course_id', currentCourse.id);
      
      if (deleteError) throw deleteError;
      
      // Insert new days
      const daysToInsert = data.days.map((day: any, index: number) => ({
        course_id: currentCourse.id,
        day_number: index + 1,
        title: day.title,
        info: day.info,
        media_link: day.media_link || null,
        module_1: day.module_1 || null,
        module_2: day.module_2 || null,
        module_3: day.module_3 || null
      }));
      
      const { data: daysData, error: daysError } = await supabase
        .from('course_days')
        .insert(daysToInsert)
        .select();
      
      if (daysError) throw daysError;
      
      // Update local state
      const updatedCourses = courses.map(course => 
        course.id === currentCourse.id 
          ? { 
              ...course, 
              name: data.name,
              description: data.description,
              category: data.category,
              language: data.language,
              days: daysData.map((day: any) => ({
                id: day.id,
                day_number: day.day_number,
                title: day.title,
                info: day.info,
                media_link: day.media_link || undefined,
                module_1: day.module_1 || '',
                module_2: day.module_2 || '',
                module_3: day.module_3 || ''
              })),
            } 
          : course
      );
      
      setCourses(updatedCourses);
      navigate('/courses');
      toast.success('Course updated successfully');
    } catch (error: any) {
      console.error('Error updating course:', error);
      toast.error(`Failed to update course: ${error.message}`);
    }
  };
  
  const handleDeleteCourse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setCourses(courses.filter(course => course.id !== id));
      toast.success('Course deleted successfully');
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast.error(`Failed to delete course: ${error.message}`);
    }
  };
  
  const handleArchiveCourse = async (id: string) => {
    const course = courses.find(c => c.id === id);
    if (!course) return;
    
    const newStatus = course.status === 'active' ? 'archived' : 'active';
    
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      const updatedCourses = courses.map(course => 
        course.id === id 
          ? { ...course, status: newStatus as 'active' | 'archived' | 'draft' } 
          : course
      );
      
      setCourses(updatedCourses);
      toast.success(`Course ${newStatus === 'active' ? 'activated' : 'archived'} successfully`);
    } catch (error: any) {
      console.error(`Error ${newStatus === 'active' ? 'activating' : 'archiving'} course:`, error);
      toast.error(`Failed to ${newStatus === 'active' ? 'activate' : 'archive'} course: ${error.message}`);
    }
  };

  const handleToggleVisibility = async (id: string) => {
    const course = courses.find(c => c.id === id);
    if (!course) return;
    
    const newVisibility = course.visibility === 'public' ? 'private' : 'public';
    
    try {
      const { error } = await supabase
        .from('courses')
        .update({ visibility: newVisibility })
        .eq('id', id);
      
      if (error) throw error;
      
      const updatedCourses = courses.map(course => 
        course.id === id 
          ? { ...course, visibility: newVisibility as 'public' | 'private' } 
          : course
      );
      
      setCourses(updatedCourses);
      toast.success(`Course is now ${newVisibility}`);
    } catch (error: any) {
      console.error(`Error changing course visibility:`, error);
      toast.error(`Failed to change course visibility: ${error.message}`);
    }
  };
  
  const handlePreviewCourse = (course: Course) => {
    setPreviewCourse(course);
    setShowPreview(true);
  };
  
  const handleAssignCourse = (course: Course) => {
    setAssignCourse(course);
    setShowAssignDialog(true);
  };

  const handlePromptSuccess = (courseId: string) => {
    navigate(`/courses`);
    window.location.reload();
  };
  
  // Apply filters and combine course lists based on visibility filter
  let displayedCourses: Course[] = [];

  if (visibilityFilter === 'all') {
    displayedCourses = [...courses, ...alfredCourses];
  } else if (visibilityFilter === 'public') {
    // Show both public user courses and all Alfred courses
    displayedCourses = [
      ...courses.filter(course => course.visibility === 'public'),
      ...alfredCourses
    ];
  } else if (visibilityFilter === 'private') {
    // Show only user's private courses
    displayedCourses = courses.filter(course => course.visibility === 'private');
  }
  
  // Filter by search query
  displayedCourses = displayedCourses.filter(course => 
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to check if a course is from Alfred
  const isAlfredCourse = (course: Course) => {
    return course.id.startsWith('alfred-');
  };
  
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
          
          <Card>
            <CardHeader>
              <CardTitle>{isNew ? 'Create New Course' : 'Edit Course'}</CardTitle>
              <CardDescription>
                {isNew 
                  ? 'Create a new course with daily content'
                  : 'Update course information and content'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CourseForm
                course={currentCourse}
                onSubmit={isNew ? handleCreateCourse : handleUpdateCourse}
                onCancel={() => navigate('/courses')}
              />
            </CardContent>
          </Card>
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
            onSuccess={handlePromptSuccess}
          />
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
        
        <div className="rounded-lg border bg-card">
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
              {displayedCourses.length} courses
            </div>
          </div>
          
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Course</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32">
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : displayedCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                      {searchQuery ? 'No courses match your search' : 'No courses found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedCourses.map(course => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <BookOpen size={14} />
                          </div>
                          <div>
                            <div>{course.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {course.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{course.category}</TableCell>
                      <TableCell>{course.language}</TableCell>
                      <TableCell>
                        {course.visibility === 'public' ? (
                          <div className="flex items-center gap-1">
                            <Globe size={14} className="text-green-500" />
                            <span>Public</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Lock size={14} className="text-gray-500" />
                            <span>Private</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{course.days.length} days</TableCell>
                      <TableCell>
                        <Badge variant={course.status === 'active' ? "default" : "outline"}>
                          {course.status === 'active' ? 'Active' : 'Archived'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(course.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!isAlfredCourse(course) && (
                              <DropdownMenuItem onClick={() => navigate(`/courses/${course.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handlePreviewCourse(course)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {!isAlfredCourse(course) && (
                              <DropdownMenuItem onClick={() => handleToggleVisibility(course.id)}>
                                {course.visibility === 'public' ? (
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
                            )}
                            {!isAlfredCourse(course) && (
                              <DropdownMenuItem onClick={() => handleArchiveCourse(course.id)}>
                                <Archive className="h-4 w-4 mr-2" />
                                {course.status === 'active' ? 'Archive' : 'Activate'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleAssignCourse(course)}>
                              <Users className="h-4 w-4 mr-2" />
                              Assign to Learner
                            </DropdownMenuItem>
                            {!isAlfredCourse(course) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteCourse(course.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      
      <CoursePreview 
        course={previewCourse} 
        open={showPreview} 
        onOpenChange={setShowPreview} 
      />

      <CourseAssignmentDialog
        course={assignCourse}
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
      />
    </div>
  );
};

export default Courses;
