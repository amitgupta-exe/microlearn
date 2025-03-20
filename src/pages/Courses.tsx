
import React, { useState } from 'react';
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
  BookOpen
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import CourseForm from '@/components/CourseForm';
import CoursePreview from '@/components/CoursePreview';
import { Course } from '@/lib/types';

// Mock data
const MOCK_COURSES: Course[] = [
  {
    id: '1',
    name: 'Introduction to Python',
    description: 'Learn the basics of Python programming language',
    category: 'Programming',
    language: 'English',
    days: [
      {
        id: '1-1',
        day_number: 1,
        title: 'Getting Started with Python',
        info: 'Introduction to Python, installation and setup guide',
        media_link: 'https://example.com/python-intro.mp4',
      },
      {
        id: '1-2',
        day_number: 2,
        title: 'Variables and Data Types',
        info: 'Learn about variables, strings, integers, and basic data structures',
        media_link: 'https://example.com/python-variables.pdf',
      },
    ],
    created_at: '2023-05-15T09:24:12Z',
    status: 'active',
  },
  {
    id: '2',
    name: 'Digital Marketing Fundamentals',
    description: 'Master the essentials of digital marketing',
    category: 'Marketing',
    language: 'English',
    days: [
      {
        id: '2-1',
        day_number: 1,
        title: 'Digital Marketing Overview',
        info: 'Introduction to digital marketing channels and strategies',
        media_link: 'https://example.com/digital-marketing.pdf',
      },
    ],
    created_at: '2023-06-22T14:18:36Z',
    status: 'active',
  },
  {
    id: '3',
    name: 'Web Design Basics',
    description: 'Learn modern web design principles and practices',
    category: 'Design',
    language: 'English',
    days: [
      {
        id: '3-1',
        day_number: 1,
        title: 'HTML and CSS Fundamentals',
        info: 'Introduction to HTML and CSS for web design',
        media_link: 'https://example.com/html-css.pdf',
      },
      {
        id: '3-2',
        day_number: 2,
        title: 'Responsive Design',
        info: 'Creating responsive layouts for different screen sizes',
        media_link: 'https://example.com/responsive-design.mp4',
      },
      {
        id: '3-3',
        day_number: 3,
        title: 'Design Principles',
        info: 'Core design principles for creating beautiful websites',
        media_link: 'https://example.com/design-principles.pdf',
      },
    ],
    created_at: '2023-07-10T11:42:58Z',
    status: 'active',
  },
];

// Enrollment counts for mock data
const MOCK_ENROLLMENTS = {
  '1': 24,
  '2': 18,
  '3': 12,
};

const Courses = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const isNew = id === 'new';
  const isEdit = id && id !== 'new';
  const showForm = isNew || isEdit;
  
  const currentCourse = isEdit 
    ? courses.find(course => course.id === id) 
    : undefined;
  
  const handleCreateCourse = async (data: any) => {
    // Simulating API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newCourse: Course = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      category: data.category,
      language: data.language,
      days: data.days.map((day: any, index: number) => ({
        id: `new-${index + 1}`,
        day_number: index + 1,
        title: day.title,
        info: day.info,
        media_link: day.media_link,
      })),
      created_at: new Date().toISOString(),
      status: 'active',
    };
    
    setCourses([newCourse, ...courses]);
    navigate('/courses');
  };
  
  const handleUpdateCourse = async (data: any) => {
    // Simulating API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!currentCourse) return;
    
    const updatedCourses = courses.map(course => 
      course.id === currentCourse.id 
        ? { 
            ...course, 
            name: data.name,
            description: data.description,
            category: data.category,
            language: data.language,
            days: data.days.map((day: any, index: number) => ({
              id: `${course.id}-${index + 1}`,
              day_number: index + 1,
              title: day.title,
              info: day.info,
              media_link: day.media_link,
            })),
          } 
        : course
    );
    
    setCourses(updatedCourses);
    navigate('/courses');
  };
  
  const handleDeleteCourse = (id: string) => {
    setCourses(courses.filter(course => course.id !== id));
    toast.success('Course deleted successfully');
  };
  
  const handleArchiveCourse = (id: string) => {
    const updatedCourses = courses.map(course => 
      course.id === id 
        ? { ...course, status: course.status === 'active' ? 'archived' : 'active' as any } 
        : course
    );
    
    setCourses(updatedCourses);
    toast.success(`Course ${courses.find(c => c.id === id)?.status === 'active' ? 'archived' : 'activated'} successfully`);
  };
  
  const handlePreviewCourse = (course: Course) => {
    setPreviewCourse(course);
    setShowPreview(true);
  };
  
  const filteredCourses = courses.filter(course => 
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(searchQuery.toLowerCase())
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
          <Button className="mt-4 sm:mt-0" onClick={() => navigate('/courses/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Course
          </Button>
        </div>
        
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
              {filteredCourses.length} courses
            </div>
          </div>
          
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Course</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                      {searchQuery ? 'No courses match your search' : 'No courses found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map(course => (
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
                        {(MOCK_ENROLLMENTS as any)[course.id] || 0} learners
                      </TableCell>
                      <TableCell>{course.days.length} days</TableCell>
                      <TableCell>
                        <Badge variant={course.status === 'active' ? 'default' : 'outline'}>
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
                            <DropdownMenuItem onClick={() => navigate(`/courses/${course.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreviewCourse(course)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchiveCourse(course.id)}>
                              <Archive className="h-4 w-4 mr-2" />
                              {course.status === 'active' ? 'Archive' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteCourse(course.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
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
    </div>
  );
};

export default Courses;
