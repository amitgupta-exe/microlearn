
import React, { useState, useEffect } from 'react';
import { Plus, Search, User, Mail, Phone, BookOpen, Calendar, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Learner } from '@/lib/types';
import LearnerForm from '@/components/LearnerForm';
import LearnerImport from '@/components/LearnerImport';
import AssignLearnerToCourse from '@/components/AssignLearnerToCourse';

interface LearnerWithCourse extends Learner {
  assigned_course?: {
    id: string;
    course_name: string;
  } | null;
  progress?: {
    status: string;
    current_day: number;
    progress_percent: number;
    course_name: string;
  };
}

const Learners: React.FC = () => {
  const { user } = useMultiAuth();
  const [learners, setLearners] = useState<LearnerWithCourse[]>([]);
  const [filteredLearners, setFilteredLearners] = useState<LearnerWithCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLearnerForm, setShowLearnerForm] = useState(false);
  const [showLearnerImport, setShowLearnerImport] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [showAssignCourse, setShowAssignCourse] = useState(false);
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);

  useEffect(() => {
    fetchLearners();
  }, [user]);

  useEffect(() => {
    const filtered = learners.filter(learner =>
      learner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.phone.includes(searchQuery)
    );
    setFilteredLearners(filtered);
  }, [learners, searchQuery]);

  const fetchLearners = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('learners')
        .select(`
          *,
          assigned_course:assigned_course_id(
            id,
            course_name
          )
        `)
        .eq('created_by', user?.id || '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch progress for each learner
      const learnersWithProgress: LearnerWithCourse[] = [];
      
      for (const learner of data || []) {
        const normalizedPhone = learner.phone.replace(/[^\d+]/g, '');
        
        const { data: progressData } = await supabase
          .from('course_progress')
          .select('status, current_day, progress_percent, course_name')
          .eq('phone_number', normalizedPhone.startsWith('+') ? normalizedPhone : `+91${normalizedPhone}`)
          .in('status', ['assigned', 'started'])
          .order('created_at', { ascending: false })
          .limit(1);

        learnersWithProgress.push({
          ...learner,
          progress: progressData?.[0] || undefined
        });
      }

      setLearners(learnersWithProgress);
    } catch (error) {
      console.error('Error fetching learners:', error);
      toast.error('Failed to load learners');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLearner = async (learner: Learner) => {
    try {
      const { error } = await supabase
        .from('learners')
        .delete()
        .eq('id', learner.id);

      if (error) throw error;

      toast.success('Learner deleted successfully');
      fetchLearners();
    } catch (error) {
      console.error('Error deleting learner:', error);
      toast.error('Failed to delete learner');
    }
  };

  const handleAssignCourse = (learner: Learner) => {
    setSelectedLearner(learner);
    setShowAssignCourse(true);
  };

  const handleEditLearner = (learner: Learner) => {
    setEditingLearner(learner);
    setShowLearnerForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading learners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Learners</h2>
          <p className="text-muted-foreground">
            Manage your learners and track their progress.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLearnerImport(true)}>
            Import Learners
          </Button>
          <Button onClick={() => setShowLearnerForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Learner
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search learners..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Learner Cards */}
      {filteredLearners.length === 0 ? (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No learners</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'No learners match your search.' : 'Get started by adding a new learner.'}
          </p>
          {!searchQuery && (
            <div className="mt-6">
              <Button onClick={() => setShowLearnerForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Learner
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLearners.map((learner) => (
            <Card key={learner.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{learner.name}</CardTitle>
                      <Badge variant={learner.status === 'active' ? 'default' : 'outline'}>
                        {learner.status}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
                      <DropdownMenuItem onClick={() => handleEditLearner(learner)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAssignCourse(learner)}>
                        Assign Course
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteLearner(learner)}
                        className="text-red-600"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{learner.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{learner.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(learner.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Course Assignment */}
                {learner.progress ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 text-sm">Current Course</span>
                    </div>
                    <p className="text-sm text-blue-800 font-medium">{learner.progress.course_name}</p>
                    <div className="flex justify-between items-center mt-2 text-xs text-blue-600">
                      <span>Day {learner.progress.current_day}</span>
                      <span>{learner.progress.progress_percent}% complete</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${learner.progress.progress_percent}%` }}
                      ></div>
                    </div>
                  </div>
                ) : learner.assigned_course ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-700 text-sm">Assigned Course</span>
                    </div>
                    <p className="text-sm text-gray-800">{learner.assigned_course.course_name}</p>
                    <p className="text-xs text-gray-500">Not started</p>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">No course assigned</p>
                    <Button 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={() => handleAssignCourse(learner)}
                    >
                      Assign Course
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Learner Form Dialog */}
      <LearnerForm
        open={showLearnerForm}
        onOpenChange={(open) => {
          setShowLearnerForm(open);
          if (!open) setEditingLearner(null);
        }}
        learner={editingLearner}
        onSuccess={() => {
          fetchLearners();
          setShowLearnerForm(false);
          setEditingLearner(null);
        }}
      />

      {/* Learner Import Dialog */}
      <LearnerImport
        open={showLearnerImport}
        onOpenChange={setShowLearnerImport}
        onSuccess={fetchLearners}
      />

      {/* Assign Course Dialog */}
      <AssignLearnerToCourse
        open={showAssignCourse}
        onOpenChange={setShowAssignCourse}
        learner={selectedLearner}
        onAssignmentComplete={() => {
          fetchLearners();
          setShowAssignCourse(false);
          setSelectedLearner(null);
        }}
      />
    </div>
  );
};

export default Learners;
