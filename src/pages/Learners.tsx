import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Edit, BookOpen, Trash2, Search, Users, Plus, FileUp, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import LearnerForm from '@/components/LearnerForm';
import LearnerImport from '@/components/LearnerImport';
import AssignLearnerToCourse from '@/components/AssignLearnerToCourse';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { normalizePhoneNumber } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

const Learners: React.FC = () => {
  const { user } = useMultiAuth();
  // State
  const [learners, setLearners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLearnerForm, setShowLearnerForm] = useState(false);
  const [editingLearner, setEditingLearner] = useState(null);
  const [showLearnerImport, setShowLearnerImport] = useState(false);
  const [showAssignCourse, setShowAssignCourse] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch learners and their progress in a single query
  const fetchLearners = async () => {
    setIsLoading(true);
    try {
      const { data: learners, error: learnersError } = await supabase.from('learners').select('*');
      const { data: progress, error: progressError } = await supabase.from('course_progress').select('learner_id, status, course_name, current_day');
      if (learnersError || progressError) throw learnersError || progressError;
      // Map progress to learners
      const progressMap = new Map();
      progress.forEach(p => {
        if (!progressMap.has(p.learner_id)) progressMap.set(p.learner_id, []);
        progressMap.get(p.learner_id).push(p);
      });
      const learnersWithProgress = learners.map(l => ({
        ...l,
        progress: progressMap.get(l.id) || []
      }));
      setLearners(learnersWithProgress);
    } catch (error) {
      toast.error('Failed to load learners');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLearners();
  }, []);

  // Handlers
  const handleAssignCourse = (learner) => {
    setSelectedLearner(learner);
    setShowAssignCourse(true);
  };
  const handleEditLearner = (learner) => {
    setEditingLearner(learner);
    setShowLearnerForm(true);
  };
  const handleDeleteLearner = async (learner) => {
    try {
      const { error } = await supabase.from('learners').delete().eq('id', learner.id);
      if (error) throw error;
      toast.success('Learner deleted successfully');
      fetchLearners();
    } catch (error) {
      toast.error('Failed to delete learner');
    }
  };

  // Filtered learners by search
  const filteredLearners = learners.filter(l =>
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header and Actions */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Learners</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowLearnerImport(true)} variant="outline">
            <FileUp className="mr-2 h-4 w-4" /> Import Learners
          </Button>
          <Button onClick={() => setShowLearnerForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Learner
          </Button>
        </div>
      </div>
      {/* Search */}
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search learners..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      {/* Learner Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading learners...</div>
      ) : filteredLearners.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No learners found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLearners.map((learner) => {
            // Find the most recent active/assigned course for this learner
            const assignedCourse = learner.progress.find(
              (p) => p.status === "assigned" || p.status === "started"
            );
            return (
              <Card key={learner.id} className="hover:shadow-lg transition-shadow relative">
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div>
                        <Users size={14} />
                        <div className="font-semibold text-gray-900">{learner.name}</div>
                      </div>
                      <div className="text-xs text-gray-500">{learner.email}</div>
                      <div className="text-xs text-gray-500">{learner.phone}</div>
                      {/* Assigned course info */}
                      {assignedCourse ? (
                        <div className="text-xs text-blue-700 mt-1">
                          Assigned Course: <span className="font-semibold">{assignedCourse.course_name}</span>
                          {assignedCourse.current_day && (
                            <span className="ml-2 text-gray-500">(Day {assignedCourse.current_day})</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 mt-1">No course assigned</div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full hover:bg-gray-100 focus:outline-none">
                          <MoreHorizontal className="h-5 w-5 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignCourse(learner);
                          }}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />

                          Assign a Course
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleEditLearner(learner)}>
                          <Edit className="h-4 w-4 mr-2" />

                          Edit
                        </DropdownMenuItem>

                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteLearner(learner)}>
                          <Trash2 className="h-4 w-4 mr-2" />

                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Learner Form Dialog */}
      <Dialog open={showLearnerForm} onOpenChange={(open) => {
        setShowLearnerForm(open);
        if (!open) setEditingLearner(null);
      }}>
        <DialogContent>
          <LearnerForm
            learner={editingLearner}
            onSubmit={async (data) => {
              if (!editingLearner) {
                // adds new learner if new
                const normalizedPhoneNumber = normalizePhoneNumber(data.phone)
                const newId = uuidv4();
                const newLearner = {
                  id: newId,
                  name: data.name,
                  email: data.email,
                  phone: normalizedPhoneNumber,
                  created_by: user?.id,
                  status: 'active',
                };
                const { error } = await supabase.from('learners').insert([newLearner]);
                // Also add to users table with same id
                const { error: userError } = await supabase.from('users').insert([
                  {
                    id: newId,
                    name: data.name,
                    email: data.email,
                    phone: normalizedPhoneNumber,
                    role: 'learner',
                  },
                ]);
                if (error || userError) {
                  toast.error('Failed to add learner');
                  return;
                }
              } else {
                // updates if trying to edit an existing one
                const { error } = await supabase.from('learners').update(data).eq('id', editingLearner.id);
                if (error) {
                  toast.error('Failed to update learner');
                  return;
                }
              }
              await fetchLearners();
              setShowLearnerForm(false);
              setEditingLearner(null);
            }}
            onCancel={() => {
              setShowLearnerForm(false);
              setEditingLearner(null);
            }}
          />
        </DialogContent>
      </Dialog>
      {/* Learner Import Dialog */}
      <Dialog open={showLearnerImport} onOpenChange={setShowLearnerImport}>
        <DialogContent>
          <LearnerImport
            onSuccess={() => {
              fetchLearners();
              setShowLearnerImport(false);
            }}
            onCancel={() => setShowLearnerImport(false)}
          />
        </DialogContent>
      </Dialog>
      {/* Assign Course Dialog */}
      <AssignLearnerToCourse
        open={showAssignCourse}
        onOpenChange={setShowAssignCourse}
        learner={selectedLearner}
        onAssignmentComplete={() => {
          setShowAssignCourse(false);
          setSelectedLearner(null);
          fetchLearners();
        }}
      />
    </div>
  );
};

export default Learners;
