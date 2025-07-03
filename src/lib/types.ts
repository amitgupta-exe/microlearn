
import { Tables } from '@/integrations/supabase/types';

export type Learner = Tables<'learners'> & {
  hasActiveCourse?: boolean;
  activeCourse?: string | null;
  status: 'active' | 'inactive';
};

export type Course = Tables<'courses'>;

export type UserRole = 'admin' | 'learner' | 'superadmin';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
}
