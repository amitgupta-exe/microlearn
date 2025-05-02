
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
import { toast } from 'sonner';
import { Learner } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

interface LearnerSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLearner: (learner: Learner) => void;
}

const LearnerSelector: React.FC<LearnerSelectorProps> = ({
  open,
  onOpenChange,
  onSelectLearner,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [learners, setLearners] = useState<Learner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    }
  }, [open]);

  // Filter learners based on search query
  const filteredLearners = learners.filter(learner => 
    learner.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    learner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    learner.phone.includes(searchQuery)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Learner</DialogTitle>
          <DialogDescription>
            Choose a learner to assign this course to
          </DialogDescription>
        </DialogHeader>

        <div className="p-2 flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search learners..."
              className="pl-8 glass-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-grow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-32">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Loading learners...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLearners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                    {searchQuery ? 'No learners match your search' : 'No learners found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLearners.map(learner => (
                  <TableRow 
                    key={learner.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelectLearner(learner)}
                  >
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

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LearnerSelector;
