-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.course_generation_requests (
  request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_title text NOT NULL,
  topic text NOT NULL,
  goal text NOT NULL,
  style text NOT NULL,
  language text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT course_generation_requests_pkey PRIMARY KEY (request_id)
);
CREATE TABLE public.course_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id uuid,
  learner_name text,
  course_id uuid,
  course_name text,
  status text CHECK (status = ANY (ARRAY['assigned'::text, 'started'::text, 'completed'::text, 'suspended'::text])),
  current_day integer DEFAULT 1,
  last_reminder_sent_at timestamp without time zone,
  started_at timestamp without time zone,
  completed_at timestamp without time zone,
  progress_percent integer DEFAULT 0,
  last_module_completed_at timestamp without time zone,
  reminder_count integer DEFAULT 0,
  feedback text,
  notes text,
  is_active boolean DEFAULT true,
  day1_module1 boolean DEFAULT false,
  day1_module2 boolean DEFAULT false,
  day1_module3 boolean DEFAULT false,
  day2_module1 boolean DEFAULT false,
  day2_module2 boolean DEFAULT false,
  day2_module3 boolean DEFAULT false,
  day3_module1 boolean DEFAULT false,
  day3_module2 boolean DEFAULT false,
  day3_module3 boolean DEFAULT false,
  phone_number text,
  reminder_count_day1 integer DEFAULT 0,
  reminder_count_day2 integer DEFAULT 0,
  reminder_count_day3 integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_progress_pkey PRIMARY KEY (id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  visibility text NOT NULL DEFAULT 'private'::text CHECK (visibility = ANY (ARRAY['public'::text, 'private'::text])),
  day integer NOT NULL DEFAULT 1,
  module_1 text,
  module_2 text,
  module_3 text,
  origin text NOT NULL DEFAULT 'microlearn_manual'::text CHECK (origin = ANY (ARRAY['migrated_from_airtable'::text, 'alfred'::text, 'microlearn_manual'::text, 'microlearn_cop'::text])),
  request_id uuid,
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.learners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  assigned_course_id uuid,
  CONSTRAINT learners_pkey PRIMARY KEY (id),
  CONSTRAINT learners_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT learners_assigned_course_id_fkey FOREIGN KEY (assigned_course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.registration_requests (
  request_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  number text NOT NULL,
  topic text NOT NULL,
  goal text NOT NULL,
  style text NOT NULL,
  language text NOT NULL,
  generated boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  approval_status text DEFAULT 'pending'::text CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  CONSTRAINT registration_requests_pkey PRIMARY KEY (request_id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  phone text UNIQUE,
  course_id text,
  next_day integer DEFAULT 1,
  day_completed integer DEFAULT 0,
  next_module integer DEFAULT 1,
  module_completed integer DEFAULT 0,
  last_msg text,
  question_responses text,
  interactive_responses text,
  responses text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);