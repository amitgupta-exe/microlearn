
import React, { useState, useEffect } from 'react';
import { Loader2, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Learner } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import ConfirmDialog from '@/components/ConfirmDialog';

interface LearnerSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLearner?: (learner: Learner) => void;
  onSelectLearners?: (learners: Learner[]) => void;
  multiSelect?: boolean;
  title?: string;
  description?: string;
}

/**
 * Enhanced Learner Selector with search functionality and overwrite confirmation
 * Features: search, multi-select, course status checking, buttons outside scroll area
 */
const LearnerSelector: React.FC<LearnerSelectorProps> = ({
  open,
  onOpenChange,
  onSelectLearner,
  onSelectLearners,
  multiSelect = false,
  title = "Select Learner",
  description = "Choose a learner to assign this course to",
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    learner?: Learner;
  }>({ open: false });

  console.log('LearnerSelector - multiSelect:', multiSelect, 'open:', open);

  useEffect(() => {
    if (open) {
      fetchLearners();
      setSelectedLearners([]);
      setSearchQuery('');
    }
  }, [open]);

  /**
   * Fetch learners with their course assignment status
   */
  const fetchLearners = async () => {
    try {
      setIsLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        toast.error('You must be logged in to view learners');
        return;
      }

      const { data, error } = await supabase
        .from('learners')
        .select('*')
        .eq('created_by', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching learners:', error);
        toast.error('Failed to load learners');
        return;
      }

      // Check for active course progress for each learner
      const learnersWithStatus = await Promise.all(
        (data || []).map(async (learner) => {
          const { data: progressData } = await supabase
            .from('course_progress')
            .select('course_name, status')
            .eq('phone_number', learner.phone)
            .in('status', ['assigned', 'started'])
            .limit(1);

          return {
            ...learner,
            hasActiveCourse: progressData && progressData.length > 0,
            activeCourse: progressData?.[0]?.course_name || null,
            status: learner.status as 'active' | 'inactive'
          };
        })
      );

      console.log('Fetched learners with course status:', learnersWithStatus.length);
      setLearners(learnersWithStatus);
    } catch (error) {
      console.error('Error in learners fetch:', error);
      toast.error('An error occurred while loading learners');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle learner selection with overwrite confirmation
   */
  const handleLearnerSelect = (learner: Learner) => {
    if (multiSelect) {
      const isSelected = selectedLearners.includes(learner.id);
      if (isSelected) {
        setSelectedLearners(prev => prev.filter(id => id !== learner.id));
      } else {
        setSelectedLearners(prev => [...prev, learner.id]);
      }
    } else {
      // Check if learner has active course and show confirmation
      if (learner.hasActiveCourse) {
        setConfirmDialog({
          open: true,
          learner
        });
      } else {
        onSelectLearner?.(learner);
        onOpenChange(false);
      }
    }
  };

  /**
   * Confirm overwrite of existing course
   */
  const handleConfirmOverwrite = () => {
    if (confirmDialog.learner) {
      onSelectLearner?.(confirmDialog.learner);
      onOpenChange(false);
    }
  };

  /**
   * Handle multi-select confirmation
   */
  const handleConfirmSelection = () => {
    if (multiSelect && onSelectLearners) {
      const selected = learners.filter(learner => selectedLearners.includes(learner.id));
      onSelectLearners(selected);
      onOpenChange(false);
    }
  };

  // Filter learners based on search query
  const filteredLearners = learners.filter(learner => 
    learner.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    learner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    learner.phone.includes(searchQuery)
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-white">
          {/* Header - Fixed */}
          <DialogHeader className="flex-shrink-0 border-b pb-4">
            <DialogTitle className="text-gray-900">{title}</DialogTitle>
            <DialogDescription className="text-gray-600">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* Search Bar - Fixed */}
          <div className="flex-shrink-0 p-4 bg-gray-50 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search learners by name, email, or phone..."
                className="pl-8 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {multiSelect && selectedLearners.length > 0 && (
              <div className="mt-2 text-sm text-blue-600">
                {selectedLearners.length} learner(s) selected
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  {multiSelect && <TableHead className="w-[50px]">Select</TableHead>}
                  <TableHead className="w-[250px] text-gray-700">Name</TableHead>
                  <TableHead className="text-gray-700">Email</TableHead>
                  <TableHead className="text-gray-700">Phone</TableHead>
                  <TableHead className="text-gray-700">Status</TableHead>
                  <TableHead className="text-gray-700">Current Course</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={multiSelect ? 6 : 5} className="text-center h-32">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Loading learners...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLearners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={multiSelect ? 6 : 5} className="text-center h-32 text-gray-500">
                      {searchQuery ? 'No learners match your search' : 'No learners found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLearners.map(learner => (
                    <TableRow 
                      key={learner.id} 
                      className={`cursor-pointer hover:bg-gray-50 ${
                        multiSelect && selectedLearners.includes(learner.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleLearnerSelect(learner)}
                    >
                      {multiSelect && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedLearners.includes(learner.id)}
                            onCheckedChange={() => handleLearnerSelect(learner)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <User size={14} />
                          </div>
                          {learner.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{learner.email}</TableCell>
                      <TableCell className="text-gray-600">{learner.phone}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={learner.status === 'active' ? 'default' : 'outline'}
                          className={learner.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {learner.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {learner.hasActiveCourse ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            {learner.activeCourse}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Action Buttons - Fixed at bottom, outside scroll area */}
          <DialogFooter className="flex-shrink-0 border-t pt-4 bg-white">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {multiSelect && (
              <Button 
                onClick={handleConfirmSelection}
                disabled={selectedLearners.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Select {selectedLearners.length} Learner{selectedLearners.length !== 1 ? 's' : ''}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open })}
        title="Overwrite Current Course?"
        description={`${confirmDialog.learner?.name} is currently enrolled in "${confirmDialog.learner?.activeCourse}". Assigning a new course will suspend their current progress. Continue?`}
        confirmText="Yes, Assign New Course"
        cancelText="Cancel"
        onConfirm={handleConfirmOverwrite}
        variant="destructive"
      />
    </>
  );
};

export default LearnerSelector;
