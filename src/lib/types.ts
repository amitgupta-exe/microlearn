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

export interface AlfredCourseData {
  id: string;
  course_name: string;
  day: number;
  module_1_text?: string;
  module_2_text?: string;
  module_3_text?: string;
  created_at: string;
}
