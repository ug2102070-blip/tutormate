-- ==============================================================================
-- TutorMate PostgreSQL Database Schema for Supabase
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  phone_number TEXT,
  photo_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('tutor', 'student', 'admin')),
  tutor_id UUID,
  student_doc_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Tutors Table
CREATE TABLE IF NOT EXISTS public.tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  institution TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  bkash_number TEXT,
  nagad_number TEXT,
  subscription JSONB NOT NULL DEFAULT '{"plan": "free_trial", "status": "active", "validUntil": "2099-12-31T23:59:59Z", "maxStudents": 50}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Batches Table
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade_class TEXT NOT NULL,
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  student_count INT NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Students Table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  auth_uid UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  guardian_phone TEXT,
  institution TEXT,
  enrolled_batch_ids TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  records JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (batch_id, date)
);

-- 6. Create Fees Table
CREATE TABLE IF NOT EXISTS public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial')),
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, batch_id, year, month)
);

-- 7. Create Doubts Table
CREATE TABLE IF NOT EXISTS public.doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  student_doc_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_auth_uid UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  initial_question TEXT NOT NULL,
  attachment_path TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  attachment_size INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'resolved')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_by_tutor BOOLEAN DEFAULT true,
  unread_by_student BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Doubt Messages Table
CREATE TABLE IF NOT EXISTS public.doubt_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doubt_id UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
  sender_uid UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('tutor', 'student')),
  text TEXT NOT NULL,
  attachment_path TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  attachment_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create User Presence Table
CREATE TABLE IF NOT EXISTS public.user_presence (
  uid UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role TEXT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant table permissions to roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Permissive policies for server actions (using service key or authenticated users)
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public all tutors" ON public.tutors;
DROP POLICY IF EXISTS "Public all batches" ON public.batches;
DROP POLICY IF EXISTS "Public all students" ON public.students;
DROP POLICY IF EXISTS "Public all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Public all fees" ON public.fees;
DROP POLICY IF EXISTS "Public all doubts" ON public.doubts;
DROP POLICY IF EXISTS "Public all doubt_messages" ON public.doubt_messages;
DROP POLICY IF EXISTS "Public all user_presence" ON public.user_presence;
DROP POLICY IF EXISTS "Public all feedback" ON public.feedback;

CREATE POLICY "Public profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public tutors" ON public.tutors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public batches" ON public.batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public fees" ON public.fees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public doubts" ON public.doubts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public doubt_messages" ON public.doubt_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public user_presence" ON public.user_presence FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public feedback" ON public.feedback FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for Doubts & Messages tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.doubts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doubt_messages;

-- Create Storage Buckets (Execute in Supabase Storage UI or via SQL)
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public attachment access" ON storage.objects;
CREATE POLICY "Public attachment access" ON storage.objects FOR ALL USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');

-- 11. Create Materials Table
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL
    CHECK (file_type IN ('pdf', 'video', 'image', 'docx', 'ppt', 'other')),
  file_size INT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all materials" ON public.materials;
CREATE POLICY "Public materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;

-- 12. Create Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Create Assignment Submissions Table
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  file_path TEXT,                 -- Supabase Storage path (null until submitted)
  submitted_at TIMESTAMPTZ,
  marks_obtained NUMERIC,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'graded', 'late')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public assignments" ON public.assignments;
CREATE POLICY "Public assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public assignment_submissions" ON public.assignment_submissions;
CREATE POLICY "Public assignment_submissions" ON public.assignment_submissions FOR ALL USING (true) WITH CHECK (true);

