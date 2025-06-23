
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Phone, Mail, Calendar, BookOpen, Plus, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LearnerForm from '@/components/LearnerForm';
import LearnerImport from '@/components/LearnerImport';
import AssignLearnerToCourse from '@/components/AssignLearnerToCourse';

type Learner = Tables<'learners'>;

/**
 * Learners Page - Manage learners and assign courses
 * Features:
 * - View all learners in grid/detail view
 * - Create, edit, delete learners
 * - Import learners from CSV
 * - Assign courses to individual learners
 */
const Learners = () => {
  const { id } = useParams();
  const { user, userRole, loading } = useRequireAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  console.log('Learners page - user:', user, 'userRole:', userRole, 'loading:', loading);

  useEffect(() => {
    if (!loading && user && userRole) {
      fetchLearners();
    }
  }, [user, userRole, loading]);

  useEffect(() => {
    if (id && learners.length > 0) {
      const learner = learners.find(l => l.id === id);
      if (learner) {
        setSelectedLearner(learner);
      }
    }
  }, [id, learners]);

  /**
   * Fetch learners based on user role
   * Admins see only their learners, superadmins see all
   */
  const fetchLearners = async () => {
    console.log('Fetching learners for user:', user?.id, 'role:', userRole);
    try {
      let query = supabase.from('learners').select('*');
      
      // Filter by admin if not superadmin
      if (userRole === 'admin') {
        query = query.eq('created_by', user?.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      console.log('Fetched learners:', data?.length);
      setLearners(data || []);
    } catch (error) {
      console.error('Error fetching learners:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch learners',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  /**
   * Handle creating a new learner
   */
  const handleCreateLearner = () => {
    console.log('Opening learner form for creation');
    setSelectedLearner(null);
    setIsFormOpen(true);
  };

  /**
   * Handle editing an existing learner
   */
  const handleEditLearner = (learner: Learner) => {
    console.log('Opening learner form for editing:', learner.name);
    setSelectedLearner(learner);
    setIsFormOpen(true);
  };

  /**
   * Handle deleting a learner
   */
  const handleDeleteLearner = async (learnerId: string) => {
    console.log('Deleting learner:', learnerId);
    try {
      const { error } = await supabase.from('learners').delete().eq('id', learnerId);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Learner deleted successfully',
      });
      
      fetchLearners();
      setSelectedLearner(null);
    } catch (error) {
      console.error('Error deleting learner:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete learner',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle assigning a course to a learner
   */
  const handleAssignCourse = (learner: Learner) => {
    console.log('Opening course assignment for learner:', learner.name);
    setSelectedLearner(learner);
    setIsAssignOpen(true);
  };

  /**
   * Handle learner form submission (create/update)
   */
  const handleLearnerSubmit = async (data: { name: string; email: string; phone: string }) => {
    console.log('Submitting learner data:', data);
    try {
      if (selectedLearner) {
        // Update existing learner
        const { error } = await supabase
          .from('learners')
          .update({
            name: data.name,
            email: data.email,
            phone: data.phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedLearner.id);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Learner updated successfully',
        });
      } else {
        // Create new learner
        const { error } = await supabase
          .from('learners')
          .insert({
            name: data.name,
            email: data.email,
            phone: data.phone,
            status: 'active',
            created_by: user?.id || '',
          });

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Learner created successfully',
        });
      }
      
      // Close form and refresh data
      setIsFormOpen(false);
      setSelectedLearner(null);
      fetchLearners();
    } catch (error) {
      console.error('Error saving learner:', error);
      throw error; // Re-throw so LearnerForm can handle the error display
    }
  };

  /**
   * Handle form cancellation
   */
  const handleFormCancel = () => {
    console.log('Learner form cancelled');
    setIsFormOpen(false);
    setSelectedLearner(null);
  };

  /**
   * Handle successful import
   */
  const handleImportSuccess = () => {
    console.log('Learner import completed successfully');
    setIsImportOpen(false);
    fetchLearners();
  };

  /**
   * Handle successful course assignment
   */
  const handleAssignSuccess = () => {
    console.log('Course assignment completed successfully');
    setIsAssignOpen(false);
    fetchLearners();
  };

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 px-6 md:px-8 page-transition">
      <div className="max-w-[1400px] mx-auto">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Learners</h1>
            <p className="text-muted-foreground mt-1">
              Manage your learners and track their progress
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsImportOpen(true)} variant="outline">
              Import Learners
            </Button>
            <Button onClick={handleCreateLearner}>
              <Plus className="h-4 w-4 mr-2" />
              Add Learner
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {selectedLearner ? (
          /* Individual Learner Detail View */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLearner(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Learners
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleAssignCourse(selectedLearner)}
                    variant="outline"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Assign Course
                  </Button>
                  <Button onClick={() => handleEditLearner(selectedLearner)}>
                    Edit Learner
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteLearner(selectedLearner.id)}
                  >
                    Delete Learner
                  </Button>
                </div>
              </div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {selectedLearner.name}
              </CardTitle>
              <CardDescription>Learner Details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedLearner.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedLearner.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {new Date(selectedLearner.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">{selectedLearner.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Learners Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {learners.map((learner) => (
              <Card 
                key={learner.id} 
                className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => setSelectedLearner(learner)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{learner.name}</span>
                    <Badge variant="outline">{learner.status}</Badge>
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span className="text-xs">{learner.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="text-xs">{learner.email}</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Joined {new Date(learner.created_at).toLocaleDateString()}</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignCourse(learner);
                      }}
                    >
                      <BookOpen className="h-3 w-3 mr-1" />
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {learners.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No learners found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by adding your first learner or importing a list.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setIsImportOpen(true)} variant="outline">
                  Import Learners
                </Button>
                <Button onClick={handleCreateLearner}>
                  Add First Learner
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Learner Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedLearner ? 'Edit Learner' : 'Add New Learner'}
              </DialogTitle>
            </DialogHeader>
            <LearnerForm
              learner={selectedLearner}
              onSubmit={handleLearnerSubmit}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Learners</DialogTitle>
            </DialogHeader>
            <LearnerImport onSuccess={handleImportSuccess} />
          </DialogContent>
        </Dialog>

        {/* Assign Course Dialog */}
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Course</DialogTitle>
            </DialogHeader>
            {selectedLearner && (
              <AssignLearnerToCourse
                learner={selectedLearner}
                onSuccess={handleAssignSuccess}
                onCancel={() => setIsAssignOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Learners;
