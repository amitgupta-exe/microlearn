import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, User, MoreHorizontal, ArrowLeft, Loader2, FileUp, Users } from 'lucide-react';
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
import LearnerForm from '@/components/LearnerForm';
import LearnerImport from '@/components/LearnerImport';
import LearnerCourses from '@/components/LearnerCourses';
import { Learner } from '@/lib/types';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { supabase } from '@/integrations/supabase/client';

const Learners = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [learners, setLearners] = useState<Learner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useRequireAuth();
  
  const isNew = id === 'new';
  const isImport = id === 'import';
  const isEdit = id && id !== 'new' && id !== 'import';
  const showForm = isNew || isEdit;
  
  const currentLearner = isEdit 
    ? learners.find(learner => learner.id === id) 
    : undefined;
  
  useEffect(() => {
    const fetchLearners = async () => {
      if (!user) return;
      
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (userError && userError.code !== 'PGRST116') {
          console.error('Error fetching user:', userError);
          toast.error('Failed to fetch user data');
          return;
        }
        
        if (!userData) {
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
              id: user.id,
              email: user.email,
              name: profile?.full_name || user.email?.split('@')[0] || 'User',
            }])
            .select('*')
            .single();
            
          if (createError) {
            console.error('Error creating user:', createError);
            toast.error('Failed to create user data');
            return;
          }
        }
        
        // Fetch learners with their assigned courses
        const { data, error } = await supabase
          .from('learners')
          .select(`
            *,
            assigned_course:courses(*)
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching learners:', error);
          toast.error('Failed to load learners');
          return;
        }
        
        const learnersWithCourses = data.map(learner => ({
          ...learner,
          status: learner.status as 'active' | 'inactive'
        }));
        
        setLearners(learnersWithCourses);
      } catch (error) {
        console.error('Error in learners fetch:', error);
        toast.error('An error occurred while loading learners');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchLearners();
    }
  }, [user, authLoading, profile]);
  
  const handleCreateLearner = async (data: any) => {
    try {
      if (!user) {
        toast.error('You must be logged in to create a learner');
        return;
      }
      
      const newLearner = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: 'active' as 'active',
        created_by: user.id,
      };
      
      const { data: createdLearner, error } = await supabase
        .from('learners')
        .insert([newLearner])
        .select('*')
        .single();
        
      if (error) {
        console.error('Error creating learner:', error);
        toast.error('Failed to create learner');
        throw error;
      }
      
      try {
        await supabase.functions.invoke('send-course-notification', {
          body: {
            learner_id: createdLearner.id,
            learner_name: createdLearner.name,
            learner_phone: createdLearner.phone,
            type: 'welcome'
          }
        });
        console.log('Welcome message sent successfully');
      } catch (welcomeError) {
        console.error('Error sending welcome message:', welcomeError);
      }
      
      const learnerWithCourses: Learner = {
        ...createdLearner,
        status: createdLearner.status as 'active' | 'inactive'
      };
      
      setLearners([learnerWithCourses, ...learners]);
      toast.success('Learner created successfully');
      navigate('/learners');
    } catch (error) {
      console.error('Create learner error:', error);
      toast.error('Failed to create learner');
    }
  };
  
  const handleUpdateLearner = async (data: any) => {
    try {
      if (!currentLearner) return;
      
      const { error } = await supabase
        .from('learners')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentLearner.id);
        
      if (error) {
        console.error('Error updating learner:', error);
        toast.error('Failed to update learner');
        throw error;
      }
      
      const updatedLearners = learners.map(learner => 
        learner.id === currentLearner.id 
          ? { 
              ...learner, 
              name: data.name, 
              email: data.email, 
              phone: data.phone,
              updated_at: new Date().toISOString(),
            } 
          : learner
      );
      
      setLearners(updatedLearners);
      toast.success('Learner updated successfully');
      navigate('/learners');
    } catch (error) {
      console.error('Update learner error:', error);
      toast.error('Failed to update learner');
    }
  };
  
  const handleDeleteLearner = async (id: string) => {
    try {
      const { error } = await supabase
        .from('learners')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting learner:', error);
        toast.error('Failed to delete learner');
        throw error;
      }
      
      setLearners(learners.filter(learner => learner.id !== id));
      toast.success('Learner deleted successfully');
    } catch (error) {
      console.error('Delete learner error:', error);
      toast.error('Failed to delete learner');
    }
  };
  
  const filteredLearners = learners.filter(learner => 
    learner.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    learner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    learner.phone.includes(searchQuery)
  );
  
  if (authLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  
  if (isEdit && currentLearner) {
    return (
      <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6" 
            onClick={() => navigate('/learners')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learners
          </Button>
          
          <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Edit Learner</CardTitle>
                <CardDescription>
                  Update learner information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LearnerForm
                  learner={currentLearner}
                  onSubmit={handleUpdateLearner}
                  onCancel={() => navigate('/learners')}
                />
              </CardContent>
            </Card>
            
            <LearnerCourses learner={currentLearner} />
          </div>
        </div>
      </div>
    );
  }
  
  if (isImport) {
    return (
      <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6" 
            onClick={() => navigate('/learners')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learners
          </Button>
          
          <LearnerImport />
        </div>
      </div>
    );
  }
  
  if (showForm) {
    return (
      <div className="w-full min-h-screen py-6 px-6 md:px-8 page-transition">
        <div className="max-w-3xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6" 
            onClick={() => navigate('/learners')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learners
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle>{isNew ? 'Add New Learner' : 'Edit Learner'}</CardTitle>
              <CardDescription>
                {isNew 
                  ? 'Create a new learner profile'
                  : 'Update learner information'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LearnerForm
                learner={currentLearner}
                onSubmit={isNew ? handleCreateLearner : handleUpdateLearner}
                onCancel={() => navigate('/learners')}
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
            <h1 className="text-3xl font-bold tracking-tight">Learners</h1>
            <p className="text-muted-foreground mt-1">
              Manage your learners and their course assignments
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            <Button variant="outline" onClick={() => navigate('/learners/import')}>
              <FileUp className="mr-2 h-4 w-4" />
              Import Learners
            </Button>
            <Button onClick={() => navigate('/learners/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Learner
            </Button>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card">
          <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search learners..."
                className="pl-8 glass-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              {filteredLearners.length} learners
            </div>
          </div>
          
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2">Loading learners...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLearners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                      {searchQuery ? 'No learners match your search' : 'No learners found. Create your first one!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLearners.map(learner => (
                    <TableRow key={learner.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User size={14} />
                          </div>
                          {learner.name}
                        </div>
                      </TableCell>
                      <TableCell>{learner.email}</TableCell>
                      <TableCell>{learner.phone}</TableCell>
                      <TableCell>
                        {learner.assigned_course ? (
                          <Badge variant="secondary">
                            {learner.assigned_course.course_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No course assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={learner.status === 'active' ? 'default' : 'outline'}>
                          {learner.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(learner.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/learners/${learner.id}`)}>
                              Manage
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteLearner(learner.id)}
                            >
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
    </div>
  );
};

export default Learners;
