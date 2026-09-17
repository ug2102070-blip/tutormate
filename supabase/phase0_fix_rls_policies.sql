-- ==============================================================================
-- TutorMate: Phase 0 Security Fix — Restore Ownership-Based RLS Policies
--
-- PROBLEM: fix_security_advisor_issues.sql replaced all ownership-based RLS
-- with blanket USING (true) / USING (auth.role() = 'authenticated') policies,
-- effectively giving every authenticated user read/write access to ALL data
-- across ALL tutors. This is a complete multi-tenant data isolation failure.
--
-- FIX: This script restores strict per-owner RLS policies on every affected
-- table. Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
--
-- Safe to run multiple times (idempotent — DROP IF EXISTS before CREATE).
-- ==============================================================================

-- ==============================================================================
-- STEP 0: RLS AUDIT — Run this block first to verify current RLS state
-- ==============================================================================
-- Copy and run this SELECT in Supabase SQL Editor to audit all tables:
--
-- SELECT
--   t.tablename,
--   t.rowsecurity AS rls_enabled,
--   p.policyname,
--   p.cmd,
--   p.qual
-- FROM pg_tables t
-- LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
-- WHERE t.schemaname = 'public'
--   AND t.tablename IN (
--     'materials','batches','students','fees','attendance','notifications',
--     'profiles','tutors','enrollments','study_materials','coaching_centers'
--   )
-- ORDER BY t.tablename, p.policyname;
--
-- Expected: rls_enabled = true for ALL tables.
-- Any table with rls_enabled = false is a critical security gap.
-- ==============================================================================

-- ==============================================================================
-- SERVICE ROLE GRANTS — Ensure admin client can bypass RLS on all tables
-- The service role key already bypasses RLS in Supabase by design,
-- but explicit GRANTs are required for RPC functions and edge cases.
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Also ensure authenticated role can call RPCs:
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- ==============================================================================
-- STEP 1: ENABLE RLS on tables (idempotent — safe to re-run)
-- ==============================================================================
ALTER TABLE IF EXISTS public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coaching_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notices ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- HELPER: Reusable function to check if user is a tutor
-- ──────────────────────────────────────────────────────────────────────────────
-- We use inline subqueries instead of a helper function to avoid SECURITY
-- DEFINER gotchas. Each policy references auth.uid() directly.

-- ==============================================================================
-- DROP ALL NEW-STYLE POLICIES — safe, fully idempotent
--
-- Uses a PL/pgSQL DO block so that:
--   1. Policies that don't exist are silently skipped (IF EXISTS).
--   2. Tables that don't exist yet are silently skipped (table existence check).
--      This prevents error 42P01 "relation does not exist" for tables that
--      haven't been migrated into this project yet.
-- ==============================================================================
DO $$
DECLARE
  _tbl TEXT;
  _pol TEXT;
  _pairs TEXT[][] := ARRAY[
    -- table                    policy name
    ARRAY['materials',          'materials_select'],
    ARRAY['materials',          'materials_insert'],
    ARRAY['materials',          'materials_update'],
    ARRAY['materials',          'materials_delete'],
    ARRAY['assignments',        'assignments_select'],
    ARRAY['assignments',        'assignments_insert'],
    ARRAY['assignments',        'assignments_update'],
    ARRAY['assignments',        'assignments_delete'],
    ARRAY['assignment_submissions', 'submissions_select'],
    ARRAY['assignment_submissions', 'submissions_insert'],
    ARRAY['assignment_submissions', 'submissions_update'],
    ARRAY['assignment_submissions', 'submissions_delete'],
    ARRAY['exams',              'exams_select'],
    ARRAY['exams',              'exams_insert'],
    ARRAY['exams',              'exams_update'],
    ARRAY['exams',              'exams_delete'],
    ARRAY['exam_results',       'exam_results_select'],
    ARRAY['exam_results',       'exam_results_insert'],
    ARRAY['exam_results',       'exam_results_update'],
    ARRAY['exam_results',       'exam_results_delete'],
    ARRAY['events',             'events_select'],
    ARRAY['events',             'events_insert'],
    ARRAY['events',             'events_update'],
    ARRAY['events',             'events_delete'],
    ARRAY['qr_tokens',          'qr_tokens_select'],
    ARRAY['qr_tokens',          'qr_tokens_insert'],
    ARRAY['qr_tokens',          'qr_tokens_update'],
    ARRAY['qr_tokens',          'qr_tokens_delete'],
    ARRAY['coaching_centers',   'coaching_centers_select'],
    ARRAY['coaching_centers',   'coaching_centers_insert'],
    ARRAY['coaching_centers',   'coaching_centers_update'],
    ARRAY['coaching_centers',   'coaching_centers_delete'],
    ARRAY['user_permissions',   'user_permissions_select'],
    ARRAY['user_permissions',   'user_permissions_insert'],
    ARRAY['user_permissions',   'user_permissions_update'],
    ARRAY['user_permissions',   'user_permissions_delete'],
    ARRAY['batch_enrollments',  'batch_enrollments_select'],
    ARRAY['batch_enrollments',  'batch_enrollments_insert'],
    ARRAY['batch_enrollments',  'batch_enrollments_update'],
    ARRAY['batch_enrollments',  'batch_enrollments_delete'],
    ARRAY['conversations',      'conversations_select'],
    ARRAY['conversations',      'conversations_insert'],
    ARRAY['conversations',      'conversations_update'],
    ARRAY['conversations',      'conversations_delete'],
    ARRAY['chat_messages',      'chat_messages_select'],
    ARRAY['chat_messages',      'chat_messages_insert'],
    ARRAY['chat_messages',      'chat_messages_update'],
    ARRAY['chat_messages',      'chat_messages_delete'],
    ARRAY['notifications',      'notifications_select'],
    ARRAY['notifications',      'notifications_update'],
    ARRAY['notifications',      'notifications_delete'],
    ARRAY['parent_links',       'parent_links_select'],
    ARRAY['parent_links',       'parent_links_insert'],
    ARRAY['parent_links',       'parent_links_delete'],
    ARRAY['feedback',           'feedback_select'],
    ARRAY['feedback',           'feedback_insert'],
    ARRAY['feedback',           'feedback_update'],
    ARRAY['feedback',           'feedback_delete'],
    ARRAY['doubt_messages',     'Doubt Messages SELECT policy'],
    ARRAY['doubt_messages',     'Doubt Messages WRITE policy'],
    ARRAY['tutors',             'tutors_select'],
    -- Core tables with broken blanket policies (phase 1 fix)
    ARRAY['attendance',         'attendance_select'],
    ARRAY['attendance',         'attendance_insert'],
    ARRAY['attendance',         'attendance_update'],
    ARRAY['attendance',         'attendance_delete'],
    ARRAY['batches',            'batches_select'],
    ARRAY['batches',            'batches_insert'],
    ARRAY['batches',            'batches_update'],
    ARRAY['batches',            'batches_delete'],
    ARRAY['fees',               'fees_select'],
    ARRAY['fees',               'fees_insert'],
    ARRAY['fees',               'fees_update'],
    ARRAY['fees',               'fees_delete'],
    ARRAY['profiles',           'profiles_select'],
    ARRAY['profiles',           'profiles_insert'],
    ARRAY['profiles',           'profiles_update'],
    ARRAY['profiles',           'profiles_delete'],
    ARRAY['students',           'students_select'],
    ARRAY['students',           'students_insert'],
    ARRAY['students',           'students_update'],
    ARRAY['students',           'students_delete']
  ];
  _pair TEXT[];
BEGIN
  FOREACH _pair SLICE 1 IN ARRAY _pairs LOOP
    _tbl := _pair[1];
    _pol := _pair[2];
    -- Only attempt DROP if the table actually exists in public schema
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = _tbl
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _pol, _tbl);
    END IF;
  END LOOP;
END $$;

-- Storage policies (storage.objects always exists in Supabase)
DROP POLICY IF EXISTS "Attachment insert access" ON storage.objects;
DROP POLICY IF EXISTS "Attachment update access" ON storage.objects;
DROP POLICY IF EXISTS "Attachment delete access" ON storage.objects;
DROP POLICY IF EXISTS "Attachment select access" ON storage.objects;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. MATERIALS — Tutors own their materials; students can read published ones
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Materials SELECT policy" ON public.materials;
DROP POLICY IF EXISTS "Materials WRITE policy" ON public.materials;
DROP POLICY IF EXISTS "Public materials" ON public.materials;
DROP POLICY IF EXISTS "Public all materials" ON public.materials;

-- Tutors see their own materials; students see published materials for their enrolled batches
CREATE POLICY "materials_select"
  ON public.materials FOR SELECT TO authenticated
  USING (
    -- Tutor sees their own
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR
    -- Student sees published materials in their enrolled batches
    (
      is_published = true
      AND (
        batch_id IS NULL  -- global material, visible to all enrolled students of this tutor
        OR batch_id::text = ANY(
          SELECT unnest(enrolled_batch_ids)
          FROM public.students
          WHERE auth_uid = auth.uid()
        )
      )
    )
  );

-- Only the owning tutor can insert/update/delete
CREATE POLICY "materials_insert"
  ON public.materials FOR INSERT TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "materials_update"
  ON public.materials FOR UPDATE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "materials_delete"
  ON public.materials FOR DELETE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. ASSIGNMENTS — Tutors own; students see their batch's published assignments
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Assignments SELECT policy" ON public.assignments;
DROP POLICY IF EXISTS "Assignments WRITE policy" ON public.assignments;
DROP POLICY IF EXISTS "Public assignments" ON public.assignments;

CREATE POLICY "assignments_select"
  ON public.assignments FOR SELECT TO authenticated
  USING (
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR (
      is_published = true
      AND batch_id::text = ANY(
        SELECT unnest(enrolled_batch_ids) FROM public.students WHERE auth_uid = auth.uid()
      )
    )
  );

CREATE POLICY "assignments_insert"
  ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "assignments_update"
  ON public.assignments FOR UPDATE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "assignments_delete"
  ON public.assignments FOR DELETE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));


-- ──────────────────────────────────────────────────────────────────────────────
-- 3. ASSIGNMENT SUBMISSIONS — Students see/submit their own; tutors see all in batch
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assignment_submissions') THEN
    DROP POLICY IF EXISTS "Assignment Submissions SELECT policy" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Assignment Submissions WRITE policy" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Public assignment_submissions" ON public.assignment_submissions;

    CREATE POLICY "submissions_select"
      ON public.assignment_submissions FOR SELECT TO authenticated
      USING (
        student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
        OR assignment_id IN (
          SELECT id FROM public.assignments
          WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
        )
      );
    CREATE POLICY "submissions_insert"
      ON public.assignment_submissions FOR INSERT TO authenticated
      WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
        OR assignment_id IN (
          SELECT id FROM public.assignments
          WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
        )
      );
    CREATE POLICY "submissions_update"
      ON public.assignment_submissions FOR UPDATE TO authenticated
      USING (
        student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
        OR assignment_id IN (
          SELECT id FROM public.assignments
          WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
        )
      );
    CREATE POLICY "submissions_delete"
      ON public.assignment_submissions FOR DELETE TO authenticated
      USING (
        assignment_id IN (
          SELECT id FROM public.assignments
          WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
        )
      );
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 4. EXAMS — Tutors own; students see exams in their enrolled batches
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Exams SELECT policy" ON public.exams;
DROP POLICY IF EXISTS "Exams WRITE policy" ON public.exams;
DROP POLICY IF EXISTS "Public exams" ON public.exams;

CREATE POLICY "exams_select"
  ON public.exams FOR SELECT TO authenticated
  USING (
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR batch_id::text = ANY(
      SELECT unnest(enrolled_batch_ids) FROM public.students WHERE auth_uid = auth.uid()
    )
  );

CREATE POLICY "exams_insert"
  ON public.exams FOR INSERT TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "exams_update"
  ON public.exams FOR UPDATE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "exams_delete"
  ON public.exams FOR DELETE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));


-- ──────────────────────────────────────────────────────────────────────────────
-- 5. EXAM RESULTS — Tutors own; students see their own results
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='exam_results') THEN
    DROP POLICY IF EXISTS "Exam Results SELECT policy" ON public.exam_results;
    DROP POLICY IF EXISTS "Exam Results WRITE policy" ON public.exam_results;
    DROP POLICY IF EXISTS "Public exam_results" ON public.exam_results;
    CREATE POLICY "exam_results_select"
      ON public.exam_results FOR SELECT TO authenticated
      USING (
        student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
        OR exam_id IN (SELECT id FROM public.exams WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
      );
    CREATE POLICY "exam_results_insert"
      ON public.exam_results FOR INSERT TO authenticated
      WITH CHECK (exam_id IN (SELECT id FROM public.exams WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())));
    CREATE POLICY "exam_results_update"
      ON public.exam_results FOR UPDATE TO authenticated
      USING (exam_id IN (SELECT id FROM public.exams WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())));
    CREATE POLICY "exam_results_delete"
      ON public.exam_results FOR DELETE TO authenticated
      USING (exam_id IN (SELECT id FROM public.exams WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())));
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 6. EVENTS (Calendar) — Tutors own; students see events in their batches
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='events') THEN
    DROP POLICY IF EXISTS "Events SELECT policy" ON public.events;
    DROP POLICY IF EXISTS "Events WRITE policy" ON public.events;
    DROP POLICY IF EXISTS "Public events" ON public.events;
    CREATE POLICY "events_select"
      ON public.events FOR SELECT TO authenticated
      USING (
        tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
        OR (batch_id IS NULL OR batch_id::text = ANY(SELECT unnest(enrolled_batch_ids) FROM public.students WHERE auth_uid = auth.uid()))
      );
    CREATE POLICY "events_insert"
      ON public.events FOR INSERT TO authenticated
      WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));
    CREATE POLICY "events_update"
      ON public.events FOR UPDATE TO authenticated
      USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
      WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));
    CREATE POLICY "events_delete"
      ON public.events FOR DELETE TO authenticated
      USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 7. QR TOKENS — Only the owning tutor can see/manage QR tokens
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "QR Tokens SELECT policy" ON public.qr_tokens;
DROP POLICY IF EXISTS "QR Tokens WRITE policy" ON public.qr_tokens;
DROP POLICY IF EXISTS "Public qr_tokens" ON public.qr_tokens;

-- Students need to validate a QR token when scanning — allow select by token value
CREATE POLICY "qr_tokens_select"
  ON public.qr_tokens FOR SELECT TO authenticated
  USING (
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR is_used = false  -- students can read active tokens to validate their scan
  );

CREATE POLICY "qr_tokens_insert"
  ON public.qr_tokens FOR INSERT TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "qr_tokens_update"
  ON public.qr_tokens FOR UPDATE TO authenticated
  USING (
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR (is_used = false)  -- students can mark a token as used when scanning
  );

CREATE POLICY "qr_tokens_delete"
  ON public.qr_tokens FOR DELETE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));


-- ──────────────────────────────────────────────────────────────────────────────
-- 8. COACHING CENTERS — Owner manages their center; tutors see their center
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Coaching Centers SELECT policy" ON public.coaching_centers;
DROP POLICY IF EXISTS "Coaching Centers WRITE policy" ON public.coaching_centers;
DROP POLICY IF EXISTS "Public coaching_centers" ON public.coaching_centers;

CREATE POLICY "coaching_centers_select"
  ON public.coaching_centers FOR SELECT TO authenticated
  USING (
    -- Owner sees their own center
    owner_uid = auth.uid()
    OR
    -- Tutors see the center they belong to
    id IN (SELECT coaching_center_id FROM public.tutors WHERE user_id = auth.uid())
    OR
    -- Students can read center info (for join code validation)
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.tutors t ON t.id = s.tutor_id
      WHERE s.auth_uid = auth.uid()
      AND t.coaching_center_id = public.coaching_centers.id
    )
  );

CREATE POLICY "coaching_centers_insert"
  ON public.coaching_centers FOR INSERT TO authenticated
  WITH CHECK (owner_uid = auth.uid());

CREATE POLICY "coaching_centers_update"
  ON public.coaching_centers FOR UPDATE TO authenticated
  USING (owner_uid = auth.uid())
  WITH CHECK (owner_uid = auth.uid());

CREATE POLICY "coaching_centers_delete"
  ON public.coaching_centers FOR DELETE TO authenticated
  USING (owner_uid = auth.uid());


-- ──────────────────────────────────────────────────────────────────────────────
-- 9. USER PERMISSIONS — Only admins/owners can manage; users see their own
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_permissions') THEN
    DROP POLICY IF EXISTS "User Permissions SELECT policy" ON public.user_permissions;
    DROP POLICY IF EXISTS "User Permissions WRITE policy" ON public.user_permissions;
    DROP POLICY IF EXISTS "Public user_permissions" ON public.user_permissions;
    CREATE POLICY "user_permissions_select"
      ON public.user_permissions FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')));
    CREATE POLICY "user_permissions_insert"
      ON public.user_permissions FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')));
    CREATE POLICY "user_permissions_update"
      ON public.user_permissions FOR UPDATE TO authenticated
      USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')));
    CREATE POLICY "user_permissions_delete"
      ON public.user_permissions FOR DELETE TO authenticated
      USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')));
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 10. BATCH ENROLLMENTS — Tutors manage; students see their own enrollments
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='batch_enrollments') THEN
    DROP POLICY IF EXISTS "Batch Enrollments SELECT policy" ON public.batch_enrollments;
    DROP POLICY IF EXISTS "Batch Enrollments WRITE policy" ON public.batch_enrollments;
    DROP POLICY IF EXISTS "Public batch_enrollments" ON public.batch_enrollments;
    CREATE POLICY "batch_enrollments_select"
      ON public.batch_enrollments FOR SELECT TO authenticated
      USING (
        student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
        OR batch_id IN (SELECT id FROM public.batches WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
      );
    CREATE POLICY "batch_enrollments_insert"
      ON public.batch_enrollments FOR INSERT TO authenticated
      WITH CHECK (batch_id IN (SELECT id FROM public.batches WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())));
    CREATE POLICY "batch_enrollments_update"
      ON public.batch_enrollments FOR UPDATE TO authenticated
      USING (batch_id IN (SELECT id FROM public.batches WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())));
    CREATE POLICY "batch_enrollments_delete"
      ON public.batch_enrollments FOR DELETE TO authenticated
      USING (batch_id IN (SELECT id FROM public.batches WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())));
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 11. CONVERSATIONS — Only participants can access
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='conversations') THEN
    DROP POLICY IF EXISTS "Conversations SELECT policy" ON public.conversations;
    DROP POLICY IF EXISTS "Conversations WRITE policy" ON public.conversations;
    DROP POLICY IF EXISTS "Public conversations" ON public.conversations;
    CREATE POLICY "conversations_select"
      ON public.conversations FOR SELECT TO authenticated
      USING (auth.uid() = ANY(participant_uids) OR tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));
    CREATE POLICY "conversations_insert"
      ON public.conversations FOR INSERT TO authenticated
      WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));
    CREATE POLICY "conversations_update"
      ON public.conversations FOR UPDATE TO authenticated
      USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
      WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));
    CREATE POLICY "conversations_delete"
      ON public.conversations FOR DELETE TO authenticated
      USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 12. CHAT MESSAGES — Only conversation participants can see/send
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_messages') THEN
    DROP POLICY IF EXISTS "Chat Messages SELECT policy" ON public.chat_messages;
    DROP POLICY IF EXISTS "Chat Messages WRITE policy" ON public.chat_messages;
    DROP POLICY IF EXISTS "Public chat_messages" ON public.chat_messages;
    CREATE POLICY "chat_messages_select"
      ON public.chat_messages FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.conversations c WHERE c.id = public.chat_messages.conversation_id
        AND (auth.uid() = ANY(c.participant_uids) OR c.tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
      ));
    CREATE POLICY "chat_messages_insert"
      ON public.chat_messages FOR INSERT TO authenticated
      WITH CHECK (sender_uid = auth.uid() AND EXISTS (
        SELECT 1 FROM public.conversations c WHERE c.id = public.chat_messages.conversation_id
        AND (auth.uid() = ANY(c.participant_uids) OR c.tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
      ));
    CREATE POLICY "chat_messages_update"
      ON public.chat_messages FOR UPDATE TO authenticated
      USING (sender_uid = auth.uid());
    CREATE POLICY "chat_messages_delete"
      ON public.chat_messages FOR DELETE TO authenticated
      USING (sender_uid = auth.uid());
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 13. NOTIFICATIONS — Users see only their own notifications
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Notifications SELECT policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications WRITE policy" ON public.notifications;
DROP POLICY IF EXISTS "Public notifications" ON public.notifications;

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Notifications are created server-side (admin client) — no user INSERT needed
-- Only allow marking as read (update is_read)
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ──────────────────────────────────────────────────────────────────────────────
-- 14. PARENT LINKS — Parents see their own links; tutors see links for their students
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='parent_links') THEN
    DROP POLICY IF EXISTS "Parent Links SELECT policy" ON public.parent_links;
    DROP POLICY IF EXISTS "Parent Links WRITE policy" ON public.parent_links;
    DROP POLICY IF EXISTS "Public parent_links" ON public.parent_links;
    CREATE POLICY "parent_links_select"
      ON public.parent_links FOR SELECT TO authenticated
      USING (parent_uid = auth.uid() OR student_id IN (SELECT id FROM public.students WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())));
    CREATE POLICY "parent_links_insert"
      ON public.parent_links FOR INSERT TO authenticated
      WITH CHECK (parent_uid = auth.uid() OR student_id IN (SELECT id FROM public.students WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())));
    CREATE POLICY "parent_links_delete"
      ON public.parent_links FOR DELETE TO authenticated
      USING (parent_uid = auth.uid() OR student_id IN (SELECT id FROM public.students WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())));
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 15. FEEDBACK — Users see and manage only their own feedback
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feedback') THEN
    DROP POLICY IF EXISTS "Feedback SELECT policy" ON public.feedback;
    DROP POLICY IF EXISTS "Feedback INSERT policy" ON public.feedback;
    DROP POLICY IF EXISTS "Feedback UPDATE policy" ON public.feedback;
    DROP POLICY IF EXISTS "Feedback DELETE policy" ON public.feedback;
    CREATE POLICY "feedback_select"
      ON public.feedback FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "feedback_insert"
      ON public.feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    CREATE POLICY "feedback_update"
      ON public.feedback FOR UPDATE TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    CREATE POLICY "feedback_delete"
      ON public.feedback FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 16. DOUBT MESSAGES — Fix overly-permissive policy from security advisor script
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='doubt_messages') THEN
    DROP POLICY IF EXISTS "Doubt Messages SELECT policy" ON public.doubt_messages;
    DROP POLICY IF EXISTS "Doubt Messages WRITE policy" ON public.doubt_messages;
    CREATE POLICY "Doubt Messages SELECT policy"
      ON public.doubt_messages FOR SELECT TO authenticated
      USING (
        sender_uid = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.doubts d
          WHERE d.id = public.doubt_messages.doubt_id
          AND (d.student_auth_uid = auth.uid() OR d.tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
        )
      );
    CREATE POLICY "Doubt Messages WRITE policy"
      ON public.doubt_messages FOR ALL TO authenticated
      USING (
        sender_uid = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.doubts d
          WHERE d.id = public.doubt_messages.doubt_id
          AND (d.student_auth_uid = auth.uid() OR d.tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
        )
      )
      WITH CHECK (sender_uid = auth.uid());
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 17. TUTORS SELECT — Limit sensitive columns visible to non-owners
-- ──────────────────────────────────────────────────────────────────────────────
-- NOTE: The existing "Tutors SELECT policy" USING (true) lets any authenticated
-- user read bkash_number, nagad_number, subscription JSONB, and bio of every
-- tutor. Restricting via RLS on SELECT columns requires a view in PostgreSQL.
-- As an interim fix, we tighten the policy to only allow reading own record
-- for tutors, and allow students to read their specific tutor's public info.
DROP POLICY IF EXISTS "Tutors SELECT policy" ON public.tutors;

CREATE POLICY "tutors_select"
  ON public.tutors FOR SELECT TO authenticated
  USING (
    -- Tutors see their own record (full)
    user_id = auth.uid()
    OR
    -- Students can see their tutor's record (needed for student portal)
    id IN (
      SELECT tutor_id FROM public.students WHERE auth_uid = auth.uid()
    )
    OR
    -- Parents can see their child's tutor
    id IN (
      SELECT s.tutor_id FROM public.students s
      JOIN public.parent_links pl ON pl.student_id = s.id
      WHERE pl.parent_uid = auth.uid()
    )
    OR
    -- Owners can see tutors in their center
    coaching_center_id IN (
      SELECT id FROM public.coaching_centers WHERE owner_uid = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- 18. STORAGE: Add path-based ownership check on attachments bucket
-- ──────────────────────────────────────────────────────────────────────────────
-- Files must be uploaded to: {auth.uid()}/{filename}
-- This ensures each user can only INSERT/DELETE their own files.
-- The bucket is public so URLs still work without authentication.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    DROP POLICY IF EXISTS "Attachment insert access" ON storage.objects;
    DROP POLICY IF EXISTS "Attachment update access" ON storage.objects;
    DROP POLICY IF EXISTS "Attachment delete access" ON storage.objects;
    DROP POLICY IF EXISTS "Attachment select access" ON storage.objects;
    DROP POLICY IF EXISTS "Public attachment access" ON storage.objects;

    -- INSERT: File path must start with the uploader's own UID folder
    CREATE POLICY "Attachment insert access"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- UPDATE: Only the owner of the file folder can update
    CREATE POLICY "Attachment update access"
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- DELETE: Only the owner of the file folder can delete
    CREATE POLICY "Attachment delete access"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- No SELECT policy: public bucket URLs work without auth;
    -- adding SELECT would enable directory listing attacks.
  END IF;
END $$;

-- ==============================================================================
-- PHASE 1 CRITICAL FIX — Core tables with blanket insecure policies
--
-- The following 5 tables had USING (true) or auth.role()='authenticated'
-- policies applied by fix_security_advisor_issues.sql, completely breaking
-- multi-tenant data isolation. Every authenticated user could read/write
-- ALL rows across ALL tutors.
--
-- This section drops those blanket policies and replaces them with strict
-- ownership-based policies.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- A. ATTENDANCE
-- Table structure: one row per (tutor_id, batch_id, date).
-- Student data is stored in the JSONB "records" column — NO student_id column.
-- Blanket policies found: SELECT USING(true), WRITE USING(auth.role()='authenticated')
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Attendance SELECT policy" ON public.attendance;
DROP POLICY IF EXISTS "Attendance WRITE policy"  ON public.attendance;

-- Tutors see their own attendance rows.
-- Students see attendance for batches they are enrolled in (no student_id column exists).
CREATE POLICY "attendance_select"
  ON public.attendance FOR SELECT TO authenticated
  USING (
    -- Tutor sees their own attendance records
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR
    -- Student sees attendance for their enrolled batches
    batch_id IN (
      SELECT unnest(enrolled_batch_ids)::uuid
      FROM public.students WHERE auth_uid = auth.uid()
    )
  );

-- Only the owning tutor may record / modify attendance
CREATE POLICY "attendance_insert"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "attendance_update"
  ON public.attendance FOR UPDATE TO authenticated
  USING    (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "attendance_delete"
  ON public.attendance FOR DELETE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));



-- ──────────────────────────────────────────────────────────────────────────────
-- B. BATCHES
-- Blanket policies found: SELECT USING(true), all WRITE USING(auth.role()='authenticated')
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Batches SELECT policy" ON public.batches;
DROP POLICY IF EXISTS "Batches INSERT policy" ON public.batches;
DROP POLICY IF EXISTS "Batches UPDATE policy" ON public.batches;
DROP POLICY IF EXISTS "Batches DELETE policy" ON public.batches;

-- Tutor sees own batches; students see batches they are enrolled in
CREATE POLICY "batches_select"
  ON public.batches FOR SELECT TO authenticated
  USING (
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR
    id IN (
      SELECT unnest(enrolled_batch_ids)::uuid
      FROM public.students WHERE auth_uid = auth.uid()
    )
  );

-- Only the owning tutor can create/edit/delete batches
CREATE POLICY "batches_insert"
  ON public.batches FOR INSERT TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "batches_update"
  ON public.batches FOR UPDATE TO authenticated
  USING    (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "batches_delete"
  ON public.batches FOR DELETE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));


-- ──────────────────────────────────────────────────────────────────────────────
-- C. FEES
-- Blanket policies found: SELECT USING(true), WRITE USING(auth.role()='authenticated')
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Fees SELECT policy" ON public.fees;
DROP POLICY IF EXISTS "Fees WRITE policy"  ON public.fees;

-- Tutor sees fees they created; students see their own fee statements
CREATE POLICY "fees_select"
  ON public.fees FOR SELECT TO authenticated
  USING (
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR
    student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
  );

-- Only the owning tutor can create/modify fee records
CREATE POLICY "fees_insert"
  ON public.fees FOR INSERT TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "fees_update"
  ON public.fees FOR UPDATE TO authenticated
  USING    (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "fees_delete"
  ON public.fees FOR DELETE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));


-- ──────────────────────────────────────────────────────────────────────────────
-- D. PROFILES
-- Blanket policies found:
--   SELECT USING(true)
--   INSERT/UPDATE/DELETE USING((auth.uid() = id) OR auth.role()='authenticated')
--   The OR clause defeats the self-check — any authenticated user can modify
--   any other user's profile.
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Profiles SELECT policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles INSERT policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles UPDATE policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles DELETE policy" ON public.profiles;

-- Users can only read their own profile; public fields exposed via views if needed
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Users can only create/update/delete their own profile record
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING    (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE TO authenticated
  USING (id = auth.uid());


-- ──────────────────────────────────────────────────────────────────────────────
-- E. STUDENTS
-- Blanket policies found: SELECT USING(true), all WRITE USING(auth.role()='authenticated')
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Students SELECT policy" ON public.students;
DROP POLICY IF EXISTS "Students INSERT policy" ON public.students;
DROP POLICY IF EXISTS "Students UPDATE policy" ON public.students;
DROP POLICY IF EXISTS "Students DELETE policy" ON public.students;

-- Tutors see their own students; students see their own record
CREATE POLICY "students_select"
  ON public.students FOR SELECT TO authenticated
  USING (
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR
    auth_uid = auth.uid()
  );

-- Only the owning tutor can add/edit/remove student records
CREATE POLICY "students_insert"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "students_update"
  ON public.students FOR UPDATE TO authenticated
  USING    (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "students_delete"
  ON public.students FOR DELETE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));


-- ──────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (run these manually after applying to confirm)
-- ──────────────────────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, cmd, qual AS using_condition, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('attendance','batches','fees','profiles','students')
-- ORDER BY tablename, policyname;
--
-- Expected: NO row should have qual = 'true' or qual containing
-- 'auth.role() = ''authenticated''::text' without also checking auth.uid().
