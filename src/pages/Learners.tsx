
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Learner } from '@/lib/types';
import AssignLearnerToCourse from '@/components/AssignLearnerToCourse';

const Learners: React.FC = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [newLearner, setNewLearner] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [deletingLearnerId, setDeletingLearnerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLearners, setFilteredLearners] = useState<Learner[]>([]);
  const [selectedLearnerForAssignment, setSelectedLearnerForAssignment] = useState<Learner | null>(null);
  const { user } = useMultiAuth();

  useEffect(() => {
    if (user) {
      fetchLearners();
    }
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
    if (!user) {
      console.log('No user found, cannot fetch learners');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching learners for user:', user.id);

      const { data, error } = await supabase
        .from('learners')
        .select(`
          *,
          assigned_course:assigned_course_id(
            id,
            course_name
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching learners:', error);
        toast.error('Failed to load learners');
        return;
      }

      console.log('Fetched learners data:', data);
      setLearners(data || []);
    } catch (error) {
      console.error('Error in learners fetch:', error);
      toast.error('An error occurred while loading learners');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLearner = async () => {
    if (!user) {
      toast.error('You must be logged in to create learners');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('learners')
        .insert({
          ...newLearner,
          created_by: user.id,
        });

      if (error) {
        console.error('Error creating learner:', error);
        toast.error('Failed to create learner');
        return;
      }

      toast.success('Learner created successfully');
      setShowCreateDialog(false);
      setNewLearner({ name: '', email: '', phone: '', status: 'active' });
      await fetchLearners();
    } catch (error) {
      console.error('Error in create learner:', error);
      toast.error('An error occurred while creating the learner');
    } finally {
      setLoading(false);
    }
  };

  const handleEditLearner = (learner: Learner) => {
    setEditingLearner({
      ...learner,
      status: learner.status as 'active' | 'inactive'
    });
    setShowEditDialog(true);
  };

  const handleUpdateLearner = async () => {
    if (!editingLearner) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('learners')
        .update({
          name: editingLearner.name,
          email: editingLearner.email,
          phone: editingLearner.phone,
          status: editingLearner.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingLearner.id);

      if (error) {
        console.error('Error updating learner:', error);
        toast.error('Failed to update learner');
        return;
      }

      toast.success('Learner updated successfully');
      setShowEditDialog(false);
      setEditingLearner(null);
      await fetchLearners();
    } catch (error) {
      console.error('Error in update learner:', error);
      toast.error('An error occurred while updating the learner');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLearner = (id: string) => {
    setDeletingLearnerId(id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteLearner = async () => {
    if (!deletingLearnerId) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('learners')
        .delete()
        .eq('id', deletingLearnerId);

      if (error) {
        console.error('Error deleting learner:', error);
        toast.error('Failed to delete learner');
        return;
      }

      toast.success('Learner deleted successfully');
      setShowDeleteDialog(false);
      setDeletingLearnerId(null);
      await fetchLearners();
    } catch (error) {
      console.error('Error in delete learner:', error);
      toast.error('An error occurred while deleting the learner');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCourse = (learner: Learner) => {
    setSelectedLearnerForAssignment(learner);
    setShowAssignDialog(true);
  };

  if (loading && learners.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading learners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manage Learners</h2>
          <p className="text-muted-foreground">
            Track and manage all your learners.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search learners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Learner
          </Button>
        </div>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Course</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLearners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {searchQuery ? 'No learners found matching your search.' : 'No learners found. Create your first learner to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLearners.map((learner) => (
                <TableRow key={learner.id}>
                  <TableCell className="font-medium">{learner.name}</TableCell>
                  <TableCell>{learner.email}</TableCell>
                  <TableCell>{learner.phone}</TableCell>
                  <TableCell>
                    <Badge variant={learner.status === 'active' ? 'default' : 'outline'}>
                      {learner.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {learner.assigned_course ? (
                      <Badge variant="secondary">
                        {learner.assigned_course.course_name}
                      </Badge>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAssignCourse(learner)}
                      >
                        Assign Course
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditLearner(learner)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLearner(learner.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Learner Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Learner</DialogTitle>
            <DialogDescription>
              Add a new learner to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newLearner.name}
                onChange={(e) => setNewLearner({ ...newLearner, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                type="email"
                id="email"
                value={newLearner.email}
                onChange={(e) => setNewLearner({ ...newLearner, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={newLearner.phone}
                onChange={(e) => setNewLearner({ ...newLearner, phone: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <select
                id="status"
                className="col-span-3 rounded-md border-gray-200 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                value={newLearner.status}
                onChange={(e) => setNewLearner({ ...newLearner, status: e.target.value as 'active' | 'inactive' })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleCreateLearner}>
              Create Learner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Learner Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Learner</DialogTitle>
            <DialogDescription>
              Edit the details of the selected learner.
            </DialogDescription>
          </DialogHeader>
          {editingLearner && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={editingLearner.name}
                  onChange={(e) => setEditingLearner({ ...editingLearner, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  type="email"
                  id="email"
                  value={editingLearner.email}
                  onChange={(e) => setEditingLearner({ ...editingLearner, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={editingLearner.phone}
                  onChange={(e) => setEditingLearner({ ...editingLearner, phone: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <select
                  id="status"
                  className="col-span-3 rounded-md border-gray-200 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  value={editingLearner.status}
                  onChange={(e) => setEditingLearner({ ...editingLearner, status: e.target.value as 'active' | 'inactive' })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateLearner}>
              Update Learner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Learner Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Learner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this learner? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteLearner}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      {selectedLearnerForAssignment && (
        <AssignLearnerToCourse
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          learner={selectedLearnerForAssignment}
          onAssignmentComplete={() => {
            fetchLearners();
            setShowAssignDialog(false);
            setSelectedLearnerForAssignment(null);
          }}
        />
      )}
    </div>
  );
};

export default Learners;
