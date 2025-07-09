
import { Tables } from '@/integrations/supabase/types';

export type Learner = Tables<'learners'> & {
  hasActiveCourse?: boolean;
  activeCourse?: string | null;
  assigned_course?: {
    id: string;
    course_name: string;
  } | null;
};

export type Course = Tables<'courses'>;

export type UserRole = 'admin' | 'learner' | 'superadmin';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  app_metadata?: any;
  user_metadata?: any;
  aud?: string;
  created_at?: string;
}

export interface CourseGroup {
  id: string;
  course_name: string;
  request_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  status: string;
  visibility: string;
  origin: string;
  total_days: number;
}
