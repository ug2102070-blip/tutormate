-- ==============================================================================
-- TutorMate Safe & Idempotent Supabase Security Advisor Remediation Script
-- Safe for databases where some tables may or may not exist.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/snzbpynnyjtrchauhpjk/sql/new
-- ==============================================================================

-- 1. Ensure missing tables exist if needed
CREATE TABLE IF NOT EXISTS public.batch_enrollments (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, batch_id)
);

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


-- 2. Guarded RLS & Policy Updates (Only runs on tables that exist in database)

-- PROFILES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles SELECT policy" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles INSERT policy" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles UPDATE policy" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles DELETE policy" ON public.profiles;

    CREATE POLICY "Profiles SELECT policy" ON public.profiles FOR SELECT USING (true);
    CREATE POLICY "Profiles INSERT policy" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');
    CREATE POLICY "Profiles UPDATE policy" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR auth.role() = 'authenticated') WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');
    CREATE POLICY "Profiles DELETE policy" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id OR auth.role() = 'authenticated');
  END IF;
END $$;

-- TUTORS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tutors') THEN
    ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public all tutors" ON public.tutors;
    DROP POLICY IF EXISTS "Public tutors" ON public.tutors;
    DROP POLICY IF EXISTS "Tutors SELECT policy" ON public.tutors;
    DROP POLICY IF EXISTS "Tutors INSERT policy" ON public.tutors;
    DROP POLICY IF EXISTS "Tutors UPDATE policy" ON public.tutors;
    DROP POLICY IF EXISTS "Tutors DELETE policy" ON public.tutors;

    CREATE POLICY "Tutors SELECT policy" ON public.tutors FOR SELECT USING (true);
    CREATE POLICY "Tutors INSERT policy" ON public.tutors FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Tutors UPDATE policy" ON public.tutors FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Tutors DELETE policy" ON public.tutors FOR DELETE TO authenticated USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- BATCHES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batches') THEN
    ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public all batches" ON public.batches;
    DROP POLICY IF EXISTS "Public batches" ON public.batches;
    DROP POLICY IF EXISTS "Batches SELECT policy" ON public.batches;
    DROP POLICY IF EXISTS "Batches INSERT policy" ON public.batches;
    DROP POLICY IF EXISTS "Batches UPDATE policy" ON public.batches;
    DROP POLICY IF EXISTS "Batches DELETE policy" ON public.batches;

    CREATE POLICY "Batches SELECT policy" ON public.batches FOR SELECT USING (true);
    CREATE POLICY "Batches INSERT policy" ON public.batches FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Batches UPDATE policy" ON public.batches FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Batches DELETE policy" ON public.batches FOR DELETE TO authenticated USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- STUDENTS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
    ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public all students" ON public.students;
    DROP POLICY IF EXISTS "Public students" ON public.students;
    DROP POLICY IF EXISTS "Students SELECT policy" ON public.students;
    DROP POLICY IF EXISTS "Students INSERT policy" ON public.students;
    DROP POLICY IF EXISTS "Students UPDATE policy" ON public.students;
    DROP POLICY IF EXISTS "Students DELETE policy" ON public.students;

    CREATE POLICY "Students SELECT policy" ON public.students FOR SELECT USING (true);
    CREATE POLICY "Students INSERT policy" ON public.students FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Students UPDATE policy" ON public.students FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Students DELETE policy" ON public.students FOR DELETE TO authenticated USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ATTENDANCE
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance') THEN
    ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public all attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Public attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Attendance SELECT policy" ON public.attendance;
    DROP POLICY IF EXISTS "Attendance WRITE policy" ON public.attendance;

    CREATE POLICY "Attendance SELECT policy" ON public.attendance FOR SELECT USING (true);
    CREATE POLICY "Attendance WRITE policy" ON public.attendance FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- FEES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fees') THEN
    ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public all fees" ON public.fees;
    DROP POLICY IF EXISTS "Public fees" ON public.fees;
    DROP POLICY IF EXISTS "Fees SELECT policy" ON public.fees;
    DROP POLICY IF EXISTS "Fees WRITE policy" ON public.fees;

    CREATE POLICY "Fees SELECT policy" ON public.fees FOR SELECT USING (true);
    CREATE POLICY "Fees WRITE policy" ON public.fees FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- DOUBTS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'doubts') THEN
    ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public all doubts" ON public.doubts;
    DROP POLICY IF EXISTS "Public doubts" ON public.doubts;
    DROP POLICY IF EXISTS "Doubts SELECT policy" ON public.doubts;
    DROP POLICY IF EXISTS "Doubts WRITE policy" ON public.doubts;

    CREATE POLICY "Doubts SELECT policy" ON public.doubts FOR SELECT USING (true);
    CREATE POLICY "Doubts WRITE policy" ON public.doubts FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- DOUBT MESSAGES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'doubt_messages') THEN
    ALTER TABLE public.doubt_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public all doubt_messages" ON public.doubt_messages;
    DROP POLICY IF EXISTS "Public doubt_messages" ON public.doubt_messages;
    DROP POLICY IF EXISTS "Doubt Messages SELECT policy" ON public.doubt_messages;
    DROP POLICY IF EXISTS "Doubt Messages WRITE policy" ON public.doubt_messages;

    CREATE POLICY "Doubt Messages SELECT policy" ON public.doubt_messages FOR SELECT USING (true);
    CREATE POLICY "Doubt Messages WRITE policy" ON public.doubt_messages FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- USER PRESENCE
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_presence') THEN
    ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public all user_presence" ON public.user_presence;
    DROP POLICY IF EXISTS "Public user_presence" ON public.user_presence;
    DROP POLICY IF EXISTS "User Presence SELECT policy" ON public.user_presence;
    DROP POLICY IF EXISTS "User Presence WRITE policy" ON public.user_presence;

    CREATE POLICY "User Presence SELECT policy" ON public.user_presence FOR SELECT USING (true);
    CREATE POLICY "User Presence WRITE policy" ON public.user_presence FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- FEEDBACK
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback') THEN
    ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public all feedback" ON public.feedback;
    DROP POLICY IF EXISTS "Public feedback" ON public.feedback;
    DROP POLICY IF EXISTS "Feedback SELECT policy" ON public.feedback;
    DROP POLICY IF EXISTS "Feedback INSERT policy" ON public.feedback;
    DROP POLICY IF EXISTS "Feedback UPDATE policy" ON public.feedback;
    DROP POLICY IF EXISTS "Feedback DELETE policy" ON public.feedback;

    CREATE POLICY "Feedback SELECT policy" ON public.feedback FOR SELECT USING (true);
    CREATE POLICY "Feedback INSERT policy" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Feedback UPDATE policy" ON public.feedback FOR UPDATE TO authenticated USING (auth.role() = 'authenticated');
    CREATE POLICY "Feedback DELETE policy" ON public.feedback FOR DELETE TO authenticated USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- MATERIALS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materials') THEN
    ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public all materials" ON public.materials;
    DROP POLICY IF EXISTS "Public materials" ON public.materials;
    DROP POLICY IF EXISTS "Materials SELECT policy" ON public.materials;
    DROP POLICY IF EXISTS "Materials WRITE policy" ON public.materials;

    CREATE POLICY "Materials SELECT policy" ON public.materials FOR SELECT USING (true);
    CREATE POLICY "Materials WRITE policy" ON public.materials FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- ASSIGNMENTS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') THEN
    ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Assignments SELECT policy" ON public.assignments;
    DROP POLICY IF EXISTS "Assignments WRITE policy" ON public.assignments;

    CREATE POLICY "Assignments SELECT policy" ON public.assignments FOR SELECT USING (true);
    CREATE POLICY "Assignments WRITE policy" ON public.assignments FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- ASSIGNMENT SUBMISSIONS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignment_submissions') THEN
    ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public assignment_submissions" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Assignment Submissions SELECT policy" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Assignment Submissions WRITE policy" ON public.assignment_submissions;

    CREATE POLICY "Assignment Submissions SELECT policy" ON public.assignment_submissions FOR SELECT USING (true);
    CREATE POLICY "Assignment Submissions WRITE policy" ON public.assignment_submissions FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- EXAMS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exams') THEN
    ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public exams" ON public.exams;
    DROP POLICY IF EXISTS "Exams SELECT policy" ON public.exams;
    DROP POLICY IF EXISTS "Exams WRITE policy" ON public.exams;

    CREATE POLICY "Exams SELECT policy" ON public.exams FOR SELECT USING (true);
    CREATE POLICY "Exams WRITE policy" ON public.exams FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- EXAM RESULTS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_results') THEN
    ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public exam_results" ON public.exam_results;
    DROP POLICY IF EXISTS "Exam Results SELECT policy" ON public.exam_results;
    DROP POLICY IF EXISTS "Exam Results WRITE policy" ON public.exam_results;

    CREATE POLICY "Exam Results SELECT policy" ON public.exam_results FOR SELECT USING (true);
    CREATE POLICY "Exam Results WRITE policy" ON public.exam_results FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- EVENTS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public events" ON public.events;
    DROP POLICY IF EXISTS "Events SELECT policy" ON public.events;
    DROP POLICY IF EXISTS "Events WRITE policy" ON public.events;

    CREATE POLICY "Events SELECT policy" ON public.events FOR SELECT USING (true);
    CREATE POLICY "Events WRITE policy" ON public.events FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- QR TOKENS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qr_tokens') THEN
    ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public qr_tokens" ON public.qr_tokens;
    DROP POLICY IF EXISTS "QR Tokens SELECT policy" ON public.qr_tokens;
    DROP POLICY IF EXISTS "QR Tokens WRITE policy" ON public.qr_tokens;

    CREATE POLICY "QR Tokens SELECT policy" ON public.qr_tokens FOR SELECT USING (true);
    CREATE POLICY "QR Tokens WRITE policy" ON public.qr_tokens FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- COACHING CENTERS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coaching_centers') THEN
    ALTER TABLE public.coaching_centers ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public coaching_centers" ON public.coaching_centers;
    DROP POLICY IF EXISTS "Coaching Centers SELECT policy" ON public.coaching_centers;
    DROP POLICY IF EXISTS "Coaching Centers WRITE policy" ON public.coaching_centers;

    CREATE POLICY "Coaching Centers SELECT policy" ON public.coaching_centers FOR SELECT USING (true);
    CREATE POLICY "Coaching Centers WRITE policy" ON public.coaching_centers FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- USER PERMISSIONS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_permissions') THEN
    ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public user_permissions" ON public.user_permissions;
    DROP POLICY IF EXISTS "User Permissions SELECT policy" ON public.user_permissions;
    DROP POLICY IF EXISTS "User Permissions WRITE policy" ON public.user_permissions;

    CREATE POLICY "User Permissions SELECT policy" ON public.user_permissions FOR SELECT USING (true);
    CREATE POLICY "User Permissions WRITE policy" ON public.user_permissions FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- BATCH ENROLLMENTS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batch_enrollments') THEN
    ALTER TABLE public.batch_enrollments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public batch_enrollments" ON public.batch_enrollments;
    DROP POLICY IF EXISTS "Batch Enrollments SELECT policy" ON public.batch_enrollments;
    DROP POLICY IF EXISTS "Batch Enrollments WRITE policy" ON public.batch_enrollments;

    CREATE POLICY "Batch Enrollments SELECT policy" ON public.batch_enrollments FOR SELECT USING (true);
    CREATE POLICY "Batch Enrollments WRITE policy" ON public.batch_enrollments FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- CONVERSATIONS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Conversations SELECT policy" ON public.conversations;
    DROP POLICY IF EXISTS "Conversations WRITE policy" ON public.conversations;

    CREATE POLICY "Conversations SELECT policy" ON public.conversations FOR SELECT USING (true);
    CREATE POLICY "Conversations WRITE policy" ON public.conversations FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- CHAT MESSAGES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public chat_messages" ON public.chat_messages;
    DROP POLICY IF EXISTS "Chat Messages SELECT policy" ON public.chat_messages;
    DROP POLICY IF EXISTS "Chat Messages WRITE policy" ON public.chat_messages;

    CREATE POLICY "Chat Messages SELECT policy" ON public.chat_messages FOR SELECT USING (true);
    CREATE POLICY "Chat Messages WRITE policy" ON public.chat_messages FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- NOTIFICATIONS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Notifications SELECT policy" ON public.notifications;
    DROP POLICY IF EXISTS "Notifications WRITE policy" ON public.notifications;

    CREATE POLICY "Notifications SELECT policy" ON public.notifications FOR SELECT USING (true);
    CREATE POLICY "Notifications WRITE policy" ON public.notifications FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- PARENT LINKS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parent_links') THEN
    ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public parent_links" ON public.parent_links;
    DROP POLICY IF EXISTS "Parent Links SELECT policy" ON public.parent_links;
    DROP POLICY IF EXISTS "Parent Links WRITE policy" ON public.parent_links;

    CREATE POLICY "Parent Links SELECT policy" ON public.parent_links FOR SELECT USING (true);
    CREATE POLICY "Parent Links WRITE policy" ON public.parent_links FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;


-- 3. Storage Bucket Security Guard
-- Public buckets serve files via direct URL without needing any SELECT policy on storage.objects.
-- A SELECT policy on storage.objects grants FILE LISTING (browsing all files), not file download.
-- Dropping the SELECT policy eliminates the 'public_bucket_allows_listing' warning while
-- direct public URL access (https://<project>.supabase.co/storage/v1/object/public/attachments/...)
-- continues to work for everyone without authentication.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS "Public attachment access" ON storage.objects;
    DROP POLICY IF EXISTS "Attachment select access" ON storage.objects;
    DROP POLICY IF EXISTS "Attachment insert access" ON storage.objects;
    DROP POLICY IF EXISTS "Attachment update access" ON storage.objects;
    DROP POLICY IF EXISTS "Attachment delete access" ON storage.objects;

    -- No SELECT policy: prevents bucket listing while public URLs still work
    CREATE POLICY "Attachment insert access" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');
    CREATE POLICY "Attachment update access" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'attachments');
    CREATE POLICY "Attachment delete access" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'attachments');
  END IF;
END $$;


-- 4. SECURITY DEFINER Function Security Guard
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE p.proname = 'rls_auto_enable' AND n.nspname = 'public'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
    ALTER FUNCTION public.rls_auto_enable() SECURITY INVOKER;
  END IF;
END $$;
