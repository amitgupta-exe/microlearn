
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Phone, Mail, Calendar, BookOpen, Plus } from 'lucide-react';
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

type Learner = Tables<'learners'>;

const Learners = () => {
  const { id } = useParams();
  const { user, userRole, loading } = useRequireAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
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
      console.log('Fetched learners:', data);
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

  const handleCreateLearner = () => {
    console.log('Opening learner form for creation');
    setSelectedLearner(null);
    setIsFormOpen(true);
  };

  const handleEditLearner = (learner: Learner) => {
    console.log('Opening learner form for editing:', learner);
    setSelectedLearner(learner);
    setIsFormOpen(true);
  };

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
    } catch (error) {
      console.error('Error deleting learner:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete learner',
        variant: 'destructive',
      });
    }
  };

  const handleFormSuccess = () => {
    console.log('Learner form submitted successfully');
    setIsFormOpen(false);
    setSelectedLearner(null);
    fetchLearners();
  };

  const handleImportSuccess = () => {
    console.log('Learner import completed successfully');
    setIsImportOpen(false);
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

        {selectedLearner ? (
          <Card>
            <CardHeader>
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
              <div className="flex gap-2 pt-4">
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
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {learners.map((learner) => (
              <Card key={learner.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedLearner(learner)}>
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
                    <span>0 courses</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
              onSuccess={handleFormSuccess}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Learners</DialogTitle>
            </DialogHeader>
            <LearnerImport />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Learners;
