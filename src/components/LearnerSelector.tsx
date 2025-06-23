
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

interface LearnerSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLearner?: (learner: Learner) => void;
  onSelectLearners?: (learners: Learner[]) => void;
  multiSelect?: boolean;
  title?: string;
  description?: string;
}

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

  console.log('LearnerSelector - multiSelect:', multiSelect, 'open:', open);

  useEffect(() => {
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

        const learnersWithCourses = data.map(learner => ({
          ...learner,
          courses: [],
          status: learner.status as 'active' | 'inactive'
        }));

        console.log('Fetched learners:', learnersWithCourses.length);
        setLearners(learnersWithCourses);
      } catch (error) {
        console.error('Error in learners fetch:', error);
        toast.error('An error occurred while loading learners');
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchLearners();
      setSelectedLearners([]);
      setSearchQuery('');
    }
  }, [open]);

  // Filter learners based on search query
  const filteredLearners = learners.filter(learner => 
    learner.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    learner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    learner.phone.includes(searchQuery)
  );

  const handleLearnerSelect = (learner: Learner) => {
    if (multiSelect) {
      const isSelected = selectedLearners.includes(learner.id);
      if (isSelected) {
        setSelectedLearners(prev => prev.filter(id => id !== learner.id));
      } else {
        setSelectedLearners(prev => [...prev, learner.id]);
      }
    } else {
      onSelectLearner?.(learner);
      onOpenChange(false);
    }
  };

  const handleConfirmSelection = () => {
    if (multiSelect && onSelectLearners) {
      const selected = learners.filter(learner => selectedLearners.includes(learner.id));
      onSelectLearners(selected);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar - Fixed at top */}
        <div className="flex-shrink-0 p-4 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search learners by name, email, or phone..."
              className="pl-8"
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
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={multiSelect ? 5 : 4} className="text-center h-32">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Loading learners...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLearners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={multiSelect ? 5 : 4} className="text-center h-32 text-muted-foreground">
                    {searchQuery ? 'No learners match your search' : 'No learners found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLearners.map(learner => (
                  <TableRow 
                    key={learner.id} 
                    className={`cursor-pointer hover:bg-muted/50 ${
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
                      <Badge variant={learner.status === 'active' ? 'default' : 'outline'}>
                        {learner.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {multiSelect && (
            <Button 
              onClick={handleConfirmSelection}
              disabled={selectedLearners.length === 0}
            >
              Select {selectedLearners.length} Learner{selectedLearners.length !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LearnerSelector;
