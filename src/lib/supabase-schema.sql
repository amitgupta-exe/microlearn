
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Learners table
CREATE TABLE learners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL
);

-- Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'draft')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL
);

-- Course days table
CREATE TABLE course_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  info TEXT NOT NULL,
  media_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure day numbers are unique within a course
  UNIQUE (course_id, day_number)
);

-- Learner course enrollments
CREATE TABLE learner_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completion_percentage INTEGER DEFAULT 0 NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure a learner is only enrolled in a course once
  UNIQUE (learner_id, course_id)
);

-- Messages sent to learners
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id UUID REFERENCES learners(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  course_day_id UUID REFERENCES course_days(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- WhatsApp configuration
CREATE TABLE whatsapp_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  api_key TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  business_account_id TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  is_configured BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure each user has only one WhatsApp config
  UNIQUE (user_id)
);

-- Row level security policies

-- Users can only access their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_policy ON users
  USING (id = auth.uid());

-- Learners can be accessed by their creator
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;
CREATE POLICY learners_policy ON learners
  USING (created_by = auth.uid());

-- Courses can be accessed by their creator
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY courses_policy ON courses
  USING (created_by = auth.uid());

-- Course days can be accessed by the course creator
ALTER TABLE course_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY course_days_policy ON course_days
  USING (EXISTS (
    SELECT 1 FROM courses WHERE courses.id = course_days.course_id AND courses.created_by = auth.uid()
  ));

-- Learner courses can be accessed by the learner and course creators
ALTER TABLE learner_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY learner_courses_policy ON learner_courses
  USING (EXISTS (
    SELECT 1 FROM learners WHERE learners.id = learner_courses.learner_id AND learners.created_by = auth.uid()
  ));

-- Messages can be accessed by the learner and course creators
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_policy ON messages
  USING (EXISTS (
    SELECT 1 FROM learners WHERE learners.id = messages.learner_id AND learners.created_by = auth.uid()
  ));

-- WhatsApp config can only be accessed by its owner
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_config_policy ON whatsapp_config
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_learners_created_by ON learners(created_by);
CREATE INDEX idx_courses_created_by ON courses(created_by);
CREATE INDEX idx_course_days_course_id ON course_days(course_id);
CREATE INDEX idx_learner_courses_learner_id ON learner_courses(learner_id);
CREATE INDEX idx_learner_courses_course_id ON learner_courses(course_id);
CREATE INDEX idx_messages_learner_id ON messages(learner_id);
CREATE INDEX idx_messages_course_id ON messages(course_id);
CREATE INDEX idx_messages_course_day_id ON messages(course_day_id);
CREATE INDEX idx_whatsapp_config_user_id ON whatsapp_config(user_id);

-- Setup for scheduled messaging function
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to send scheduled messages
CREATE OR REPLACE FUNCTION send_scheduled_messages()
RETURNS void AS $$
DECLARE
  course_record RECORD;
  learner_record RECORD;
  current_day_number INTEGER;
  course_day_record RECORD;
BEGIN
  -- Loop through all active learner course enrollments
  FOR learner_record IN 
    SELECT lc.id, lc.learner_id, lc.course_id, lc.start_date, l.email, l.phone
    FROM learner_courses lc
    JOIN learners l ON lc.learner_id = l.id
    WHERE lc.status = 'in_progress'
  LOOP
    -- Calculate the current day number based on start date
    current_day_number := EXTRACT(DAY FROM (NOW() - learner_record.start_date)) + 1;
    
    -- Check if there's content for this day
    SELECT * INTO course_day_record
    FROM course_days cd
    WHERE cd.course_id = learner_record.course_id AND cd.day_number = current_day_number;
    
    -- If there's content for this day and we haven't already sent it
    IF FOUND AND NOT EXISTS (
      SELECT 1 FROM messages
      WHERE learner_id = learner_record.learner_id
        AND course_id = learner_record.course_id
        AND course_day_id = course_day_record.id
    ) THEN
      -- Insert WhatsApp message
      INSERT INTO messages (learner_id, course_id, course_day_id, type, status)
      VALUES (learner_record.learner_id, learner_record.course_id, course_day_record.id, 'whatsapp', 'sent');
      
      -- Insert email message
      INSERT INTO messages (learner_id, course_id, course_day_id, type, status)
      VALUES (learner_record.learner_id, learner_record.course_id, course_day_record.id, 'email', 'sent');
      
      -- Update completion percentage
      UPDATE learner_courses
      SET completion_percentage = 
        ROUND((current_day_number::float / (
          SELECT COUNT(*) FROM course_days WHERE course_id = learner_record.course_id
        )::float) * 100)
      WHERE id = learner_record.id;
      
      -- If this was the last day, mark as completed
      IF NOT EXISTS (
        SELECT 1 FROM course_days
        WHERE course_id = learner_record.course_id AND day_number > current_day_number
      ) THEN
        UPDATE learner_courses
        SET status = 'completed', completion_percentage = 100
        WHERE id = learner_record.id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run daily
SELECT cron.schedule('0 8 * * *', 'SELECT send_scheduled_messages()');
