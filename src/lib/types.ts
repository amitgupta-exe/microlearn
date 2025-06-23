
export interface Course {
  id?: string;
  request_id?: string;
  course_name?: string;
  visibility?: string;
  origin?: string;
  day?: number;
  module_1?: string;
  module_2?: string;
  module_3?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  status?: string;
}

export interface Learner {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  assigned_course_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  assigned_course?: Course;
}

export interface RegistrationRequest {
  request_id: string;
  name: string;
  number: string;
  language: string;
  topic: string;
  style: string;
  goal: string;
  generated: boolean;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
}

export interface CourseProgress {
  id: string;
  learner_id: string;
  course_id: string;
  current_day: number;
  last_reminder_sent_at?: string;
  started_at?: string;
  completed_at?: string;
  progress_percent: number;
  last_module_completed_at?: string;
  reminder_count: number;
  is_active: boolean;
  day1_module1: boolean;
  day1_module2: boolean;
  day1_module3: boolean;
  day2_module1: boolean;
  day2_module2: boolean;
  day2_module3: boolean;
  day3_module1: boolean;
  day3_module2: boolean;
  day3_module3: boolean;
  reminder_count_day1: number;
  reminder_count_day2: number;
  reminder_count_day3: number;
  status?: string;
  course_name?: string;
  feedback?: string;
  learner_name?: string;
  phone_number?: string;
  notes?: string;
  created_at: string;
  course?: Course;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'superadmin' | 'admin' | 'learner';
