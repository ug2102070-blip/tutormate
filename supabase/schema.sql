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
  role TEXT NOT NULL CHECK (role IN ('tutor', 'student', 'admin', 'parent', 'owner')),
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

-- Permissive policies for server actions & authenticated users
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;

DROP POLICY IF EXISTS "Public all tutors" ON public.tutors;
DROP POLICY IF EXISTS "Public tutors" ON public.tutors;

DROP POLICY IF EXISTS "Public all batches" ON public.batches;
DROP POLICY IF EXISTS "Public batches" ON public.batches;

DROP POLICY IF EXISTS "Public all students" ON public.students;
DROP POLICY IF EXISTS "Public students" ON public.students;

DROP POLICY IF EXISTS "Public all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Public attendance" ON public.attendance;

DROP POLICY IF EXISTS "Public all fees" ON public.fees;
DROP POLICY IF EXISTS "Public fees" ON public.fees;

DROP POLICY IF EXISTS "Public all doubts" ON public.doubts;
DROP POLICY IF EXISTS "Public doubts" ON public.doubts;

DROP POLICY IF EXISTS "Public all doubt_messages" ON public.doubt_messages;
DROP POLICY IF EXISTS "Public doubt_messages" ON public.doubt_messages;

DROP POLICY IF EXISTS "Public all user_presence" ON public.user_presence;
DROP POLICY IF EXISTS "Public user_presence" ON public.user_presence;

DROP POLICY IF EXISTS "Public all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Public feedback" ON public.feedback;

CREATE POLICY "Profiles SELECT policy" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles INSERT policy" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');
CREATE POLICY "Profiles UPDATE policy" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR auth.role() = 'authenticated') WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');
CREATE POLICY "Profiles DELETE policy" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id OR auth.role() = 'authenticated');

CREATE POLICY "Tutors SELECT policy" ON public.tutors FOR SELECT USING (true);
CREATE POLICY "Tutors INSERT policy" ON public.tutors FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tutors UPDATE policy" ON public.tutors FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tutors DELETE policy" ON public.tutors FOR DELETE TO authenticated USING (auth.role() = 'authenticated');

CREATE POLICY "Batches SELECT policy" ON public.batches FOR SELECT USING (true);
CREATE POLICY "Batches INSERT policy" ON public.batches FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Batches UPDATE policy" ON public.batches FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Batches DELETE policy" ON public.batches FOR DELETE TO authenticated USING (auth.role() = 'authenticated');

CREATE POLICY "Students SELECT policy" ON public.students FOR SELECT USING (true);
CREATE POLICY "Students INSERT policy" ON public.students FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Students UPDATE policy" ON public.students FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Students DELETE policy" ON public.students FOR DELETE TO authenticated USING (auth.role() = 'authenticated');

CREATE POLICY "Attendance SELECT policy" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Attendance WRITE policy" ON public.attendance FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Fees SELECT policy" ON public.fees FOR SELECT USING (true);
CREATE POLICY "Fees WRITE policy" ON public.fees FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Doubts SELECT policy" ON public.doubts FOR SELECT USING (true);
CREATE POLICY "Doubts WRITE policy" ON public.doubts FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Doubt Messages SELECT policy" ON public.doubt_messages FOR SELECT USING (true);
CREATE POLICY "Doubt Messages WRITE policy" ON public.doubt_messages FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "User Presence SELECT policy" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "User Presence WRITE policy" ON public.user_presence FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Feedback SELECT policy" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Feedback INSERT policy" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Feedback UPDATE policy" ON public.feedback FOR UPDATE TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY "Feedback DELETE policy" ON public.feedback FOR DELETE TO authenticated USING (auth.role() = 'authenticated');

-- Enable Supabase Realtime for Doubts & Messages tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.doubts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doubt_messages;

-- Create Storage Buckets (Execute in Supabase Storage UI or via SQL)
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public attachment access" ON storage.objects;
DROP POLICY IF EXISTS "Attachment select access" ON storage.objects;
DROP POLICY IF EXISTS "Attachment insert access" ON storage.objects;
DROP POLICY IF EXISTS "Attachment update access" ON storage.objects;
DROP POLICY IF EXISTS "Attachment delete access" ON storage.objects;

-- No SELECT policy: prevents bucket listing while public URLs still work
-- Public bucket objects are accessible via https://<project>.supabase.co/storage/v1/object/public/attachments/...
CREATE POLICY "Attachment insert access" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "Attachment update access" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'attachments');
CREATE POLICY "Attachment delete access" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'attachments');

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

-- 14. Create Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  exam_date DATE NOT NULL,
  total_marks NUMERIC NOT NULL DEFAULT 100,
  pass_marks NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Create Exam Results Table
CREATE TABLE IF NOT EXISTS public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained NUMERIC,
  grade TEXT,            -- Auto-computed server-side: A+, A, B, C, D, F
  position INT,          -- Rank within batch for this exam
  remarks TEXT,
  is_absent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (exam_id, student_id)
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public exams" ON public.exams;
CREATE POLICY "Public exams" ON public.exams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public exam_results" ON public.exam_results;
CREATE POLICY "Public exam_results" ON public.exam_results FOR ALL USING (true) WITH CHECK (true);

-- 16. Create Events Table (Calendar)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'other'
    CHECK (type IN ('holiday', 'announcement', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public events" ON public.events;
CREATE POLICY "Public events" ON public.events FOR ALL USING (true) WITH CHECK (true);

-- 17. Create QR Tokens Table & scan_method column for Attendance
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS scan_method TEXT DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS public.qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public qr_tokens" ON public.qr_tokens;
CREATE POLICY "Public qr_tokens" ON public.qr_tokens FOR ALL USING (true) WITH CHECK (true);

-- 18. Create Coaching Centers Table & coaching_center_id on Tutors
CREATE TABLE IF NOT EXISTS public.coaching_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS coaching_center_id UUID REFERENCES public.coaching_centers(id) ON DELETE SET NULL;

ALTER TABLE public.coaching_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public coaching_centers" ON public.coaching_centers;
CREATE POLICY "Public coaching_centers" ON public.coaching_centers FOR ALL USING (true) WITH CHECK (true);

-- 19. Create User Permissions Engine Table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public user_permissions" ON public.user_permissions;
CREATE POLICY "Public user_permissions" ON public.user_permissions FOR ALL USING (true) WITH CHECK (true);

-- 20. Feature 28: Batch Enrollments Relational Junction Table
CREATE TABLE IF NOT EXISTS public.batch_enrollments (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, batch_id)
);

ALTER TABLE public.batch_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public batch_enrollments" ON public.batch_enrollments;
CREATE POLICY "Public batch_enrollments" ON public.batch_enrollments FOR ALL USING (true) WITH CHECK (true);

-- 21. Feature 23: Internal Chat System Tables
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  participant_uids UUID[] NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('direct', 'announcement')),
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_uid UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  attachment_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public conversations" ON public.conversations;
CREATE POLICY "Public conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public chat_messages" ON public.chat_messages;
CREATE POLICY "Public chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- 22. Feature 11: Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL
    CHECK (type IN ('assignment', 'material', 'exam', 'fee', 'doubt', 'announcement')),
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public notifications" ON public.notifications;
CREATE POLICY "Public notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 23. Feature 12: Parent Links Table
CREATE TABLE IF NOT EXISTS public.parent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_uid UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_uid, student_id)
);

ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public parent_links" ON public.parent_links;
CREATE POLICY "Public parent_links" ON public.parent_links FOR ALL USING (true) WITH CHECK (true);

-- 24. Feature 28: High-Performance Composite B-Tree Database Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON public.attendance(batch_id, date);
CREATE INDEX IF NOT EXISTS idx_fees_student_month ON public.fees(student_id, year, month);
CREATE INDEX IF NOT EXISTS idx_doubts_tutor_status ON public.doubts(tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_materials_batch ON public.materials(batch_id, tutor_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.assignment_submissions(assignment_id, status);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON public.exam_results(exam_id, marks_obtained DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_enrollments_student ON public.batch_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_batch_enrollments_batch ON public.batch_enrollments(batch_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON public.parent_links(parent_uid);
CREATE INDEX IF NOT EXISTS idx_parent_links_student ON public.parent_links(student_id);

-- 25. Feature: Personal Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  color TEXT DEFAULT 'default',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public notes" ON public.notes;
CREATE POLICY "Users can manage their own notes" 
ON public.notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);






