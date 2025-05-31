
export interface Course {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  days: CourseDay[];
  created_at: string;
  status: 'active' | 'archived' | 'draft';
  visibility: 'public' | 'private';
  total_enrollments?: number;
}

export interface ExtendedCourse extends Course {
  learner_count: number;
  learner_courses?: LearnerCourse[];
}

export interface CourseDay {
  id: string;
  day_number: number;
  title: string;
  info: string;
  media_link?: string;
  module_1?: string;
  module_2?: string;
  module_3?: string;
}

export interface Learner {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  total_courses: number;
  courses?: LearnerCourse[];
}

export interface LearnerCourse {
  id: string;
  learner_id: string;
  course_id: string;
  start_date: string;
  status: string;
  completion_percentage: number;
  created_at: string;
  course?: Course;
  learner?: Learner;
}

export interface ExtendedLearnerCourse extends LearnerCourse {
  course: Course;
}

export interface AlfredCourseData {
  id: string;
  course_name: string;
  day: number;
  module_1_text?: string;
  module_2_text?: string;
  module_3_text?: string;
  created_at: string;
}

export interface WatiConfig {
  id: string;
  serri_endpoint: string;
  serri_api_key: string;
  is_configured: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
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
