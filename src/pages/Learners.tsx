
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, User, MoreHorizontal, ArrowLeft } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import LearnerForm from '@/components/LearnerForm';
import { Learner } from '@/lib/types';

// Mock data
const MOCK_LEARNERS: Learner[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    courses: [],
    created_at: '2023-05-15T09:24:12Z',
    status: 'active',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+0987654321',
    courses: [],
    created_at: '2023-06-22T14:18:36Z',
    status: 'active',
  },
  {
    id: '3',
    name: 'Michael Johnson',
    email: 'michael@example.com',
    phone: '+1122334455',
    courses: [],
    created_at: '2023-07-10T11:42:58Z',
    status: 'active',
  },
];

const Learners = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [learners, setLearners] = useState<Learner[]>(MOCK_LEARNERS);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const isNew = id === 'new';
  const isEdit = id && id !== 'new';
  const showForm = isNew || isEdit;
  
  const currentLearner = isEdit 
    ? learners.find(learner => learner.id === id) 
    : undefined;
  
  const handleCreateLearner = async (data: any) => {
    // Simulating API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newLearner: Learner = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      courses: [],
      created_at: new Date().toISOString(),
      status: 'active',
    };
    
    setLearners([newLearner, ...learners]);
    navigate('/learners');
  };
  
  const handleUpdateLearner = async (data: any) => {
    // Simulating API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!currentLearner) return;
    
    const updatedLearners = learners.map(learner => 
      learner.id === currentLearner.id 
        ? { ...learner, ...data } 
        : learner
    );
    
    setLearners(updatedLearners);
    navigate('/learners');
  };
  
  const handleDeleteLearner = (id: string) => {
    setLearners(learners.filter(learner => learner.id !== id));
    toast.success('Learner deleted successfully');
  };
  
  const filteredLearners = learners.filter(learner => 
    learner.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    learner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    learner.phone.includes(searchQuery)
  );
  
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
              Manage your learners
            </p>
          </div>
          <Button className="mt-4 sm:mt-0" onClick={() => navigate('/learners/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Learner
          </Button>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLearners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                      {searchQuery ? 'No learners match your search' : 'No learners found'}
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
                              Edit
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
