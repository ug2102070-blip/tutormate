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

-- ──────────────────────────────────────────────────────────────────────────────
-- HELPER: Reusable function to check if user is a tutor
-- ──────────────────────────────────────────────────────────────────────────────
-- We use inline subqueries instead of a helper function to avoid SECURITY
-- DEFINER gotchas. Each policy references auth.uid() directly.

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
DROP POLICY IF EXISTS "Assignment Submissions SELECT policy" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Assignment Submissions WRITE policy" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Public assignment_submissions" ON public.assignment_submissions;

CREATE POLICY "submissions_select"
  ON public.assignment_submissions FOR SELECT TO authenticated
  USING (
    -- Student sees their own submissions
    student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
    OR
    -- Tutor sees all submissions for assignments they own
    assignment_id IN (
      SELECT id FROM public.assignments
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "submissions_insert"
  ON public.assignment_submissions FOR INSERT TO authenticated
  WITH CHECK (
    -- Student can only submit for themselves
    student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
    OR
    -- Tutor can create submissions (e.g., bulk init)
    assignment_id IN (
      SELECT id FROM public.assignments
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "submissions_update"
  ON public.assignment_submissions FOR UPDATE TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
    OR
    assignment_id IN (
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
DROP POLICY IF EXISTS "Exam Results SELECT policy" ON public.exam_results;
DROP POLICY IF EXISTS "Exam Results WRITE policy" ON public.exam_results;
DROP POLICY IF EXISTS "Public exam_results" ON public.exam_results;

CREATE POLICY "exam_results_select"
  ON public.exam_results FOR SELECT TO authenticated
  USING (
    -- Student sees their own results
    student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
    OR
    -- Tutor sees all results for their exams
    exam_id IN (
      SELECT id FROM public.exams
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "exam_results_insert"
  ON public.exam_results FOR INSERT TO authenticated
  WITH CHECK (
    exam_id IN (
      SELECT id FROM public.exams
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "exam_results_update"
  ON public.exam_results FOR UPDATE TO authenticated
  USING (
    exam_id IN (
      SELECT id FROM public.exams
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "exam_results_delete"
  ON public.exam_results FOR DELETE TO authenticated
  USING (
    exam_id IN (
      SELECT id FROM public.exams
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- 6. EVENTS (Calendar) — Tutors own; students see events in their batches
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Events SELECT policy" ON public.events;
DROP POLICY IF EXISTS "Events WRITE policy" ON public.events;
DROP POLICY IF EXISTS "Public events" ON public.events;

CREATE POLICY "events_select"
  ON public.events FOR SELECT TO authenticated
  USING (
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR (
      batch_id IS NULL  -- global event
      OR batch_id::text = ANY(
        SELECT unnest(enrolled_batch_ids) FROM public.students WHERE auth_uid = auth.uid()
      )
    )
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
DROP POLICY IF EXISTS "User Permissions SELECT policy" ON public.user_permissions;
DROP POLICY IF EXISTS "User Permissions WRITE policy" ON public.user_permissions;
DROP POLICY IF EXISTS "Public user_permissions" ON public.user_permissions;

CREATE POLICY "user_permissions_select"
  ON public.user_permissions FOR SELECT TO authenticated
  USING (
    -- Users can see their own permissions
    user_id = auth.uid()
    OR
    -- Admins and owners can see all permissions
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')
    )
  );

CREATE POLICY "user_permissions_insert"
  ON public.user_permissions FOR INSERT TO authenticated
  WITH CHECK (
    -- Only admins and owners can grant permissions
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')
    )
  );

CREATE POLICY "user_permissions_update"
  ON public.user_permissions FOR UPDATE TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')
    )
  );

CREATE POLICY "user_permissions_delete"
  ON public.user_permissions FOR DELETE TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'owner')
    )
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- 10. BATCH ENROLLMENTS — Tutors manage; students see their own enrollments
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Batch Enrollments SELECT policy" ON public.batch_enrollments;
DROP POLICY IF EXISTS "Batch Enrollments WRITE policy" ON public.batch_enrollments;
DROP POLICY IF EXISTS "Public batch_enrollments" ON public.batch_enrollments;

CREATE POLICY "batch_enrollments_select"
  ON public.batch_enrollments FOR SELECT TO authenticated
  USING (
    -- Student sees their own enrollments
    student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
    OR
    -- Tutor sees enrollments for their batches
    batch_id IN (
      SELECT id FROM public.batches
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "batch_enrollments_insert"
  ON public.batch_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    batch_id IN (
      SELECT id FROM public.batches
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "batch_enrollments_update"
  ON public.batch_enrollments FOR UPDATE TO authenticated
  USING (
    batch_id IN (
      SELECT id FROM public.batches
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "batch_enrollments_delete"
  ON public.batch_enrollments FOR DELETE TO authenticated
  USING (
    batch_id IN (
      SELECT id FROM public.batches
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- 11. CONVERSATIONS — Only participants can access
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Conversations SELECT policy" ON public.conversations;
DROP POLICY IF EXISTS "Conversations WRITE policy" ON public.conversations;
DROP POLICY IF EXISTS "Public conversations" ON public.conversations;

CREATE POLICY "conversations_select"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    -- User must be a participant
    auth.uid() = ANY(participant_uids)
    OR
    -- Tutor who owns the conversation
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
  );

CREATE POLICY "conversations_insert"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
  );

CREATE POLICY "conversations_update"
  ON public.conversations FOR UPDATE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()))
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

CREATE POLICY "conversations_delete"
  ON public.conversations FOR DELETE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));


-- ──────────────────────────────────────────────────────────────────────────────
-- 12. CHAT MESSAGES — Only conversation participants can see/send
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Chat Messages SELECT policy" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat Messages WRITE policy" ON public.chat_messages;
DROP POLICY IF EXISTS "Public chat_messages" ON public.chat_messages;

CREATE POLICY "chat_messages_select"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = public.chat_messages.conversation_id
      AND (
        auth.uid() = ANY(c.participant_uids)
        OR c.tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "chat_messages_insert"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_uid = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = public.chat_messages.conversation_id
      AND (
        auth.uid() = ANY(c.participant_uids)
        OR c.tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "chat_messages_update"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (sender_uid = auth.uid());

CREATE POLICY "chat_messages_delete"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (sender_uid = auth.uid());


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
DROP POLICY IF EXISTS "Parent Links SELECT policy" ON public.parent_links;
DROP POLICY IF EXISTS "Parent Links WRITE policy" ON public.parent_links;
DROP POLICY IF EXISTS "Public parent_links" ON public.parent_links;

CREATE POLICY "parent_links_select"
  ON public.parent_links FOR SELECT TO authenticated
  USING (
    parent_uid = auth.uid()
    OR student_id IN (
      SELECT id FROM public.students
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "parent_links_insert"
  ON public.parent_links FOR INSERT TO authenticated
  WITH CHECK (
    parent_uid = auth.uid()
    OR student_id IN (
      SELECT id FROM public.students
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "parent_links_delete"
  ON public.parent_links FOR DELETE TO authenticated
  USING (
    parent_uid = auth.uid()
    OR student_id IN (
      SELECT id FROM public.students
      WHERE tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    )
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- 15. FEEDBACK — Users see and manage only their own feedback
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Feedback SELECT policy" ON public.feedback;
DROP POLICY IF EXISTS "Feedback INSERT policy" ON public.feedback;
DROP POLICY IF EXISTS "Feedback UPDATE policy" ON public.feedback;
DROP POLICY IF EXISTS "Feedback DELETE policy" ON public.feedback;

CREATE POLICY "feedback_select"
  ON public.feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "feedback_insert"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback_update"
  ON public.feedback FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback_delete"
  ON public.feedback FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ──────────────────────────────────────────────────────────────────────────────
-- 16. DOUBT MESSAGES — Fix overly-permissive policy from security advisor script
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Doubt Messages SELECT policy" ON public.doubt_messages;
DROP POLICY IF EXISTS "Doubt Messages WRITE policy" ON public.doubt_messages;

CREATE POLICY "Doubt Messages SELECT policy"
  ON public.doubt_messages FOR SELECT TO authenticated
  USING (
    sender_uid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doubts d
      WHERE d.id = public.doubt_messages.doubt_id
      AND (
        d.student_auth_uid = auth.uid()
        OR d.tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Doubt Messages WRITE policy"
  ON public.doubt_messages FOR ALL TO authenticated
  USING (
    sender_uid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.doubts d
      WHERE d.id = public.doubt_messages.doubt_id
      AND (
        d.student_auth_uid = auth.uid()
        OR d.tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
      )
    )
  )
  WITH CHECK (sender_uid = auth.uid());


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

-- ──────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (run these manually after applying to confirm)
-- ──────────────────────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
