
export interface Course {
  id: string;
  course_name: string;
  day: number;
  module_1?: string;
  module_2?: string;
  module_3?: string;
  origin: 'migrated_from_airtable' | 'alfred' | 'microlearn_manual' | 'microlearn_cop';
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
  created_by: string;
  status: 'active' | 'archived' | 'draft';
  request_id?: string;
}

export interface Learner {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
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
  status: 'not_started' | 'in_progress' | 'completed' | 'suspended';
  created_at: string;
  updated_at: string;
}
