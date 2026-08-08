-- ============================================================
-- TutorMate Performance Indexes Migration (Final / Safe)
-- Verified against schema.sql — all table & column names confirmed
-- Safe to re-run: uses CREATE INDEX IF NOT EXISTS
-- Note: schema.sql already has some indexes (lines 490-501).
--       This file adds the missing ones only.
-- ============================================================

-- ── fees ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fees_tutor_id
  ON public.fees(tutor_id);

CREATE INDEX IF NOT EXISTS idx_fees_tutor_status
  ON public.fees(tutor_id, status);

CREATE INDEX IF NOT EXISTS idx_fees_student_id
  ON public.fees(student_id);

CREATE INDEX IF NOT EXISTS idx_fees_batch_id
  ON public.fees(batch_id);

-- ── attendance ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_tutor_id
  ON public.attendance(tutor_id);

CREATE INDEX IF NOT EXISTS idx_attendance_tutor_date
  ON public.attendance(tutor_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_batch_id
  ON public.attendance(batch_id);

-- ── students ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_tutor_id
  ON public.students(tutor_id);

CREATE INDEX IF NOT EXISTS idx_students_tutor_status
  ON public.students(tutor_id, status);

CREATE INDEX IF NOT EXISTS idx_students_auth_uid
  ON public.students(auth_uid);

-- ── batches ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_batches_tutor_id
  ON public.batches(tutor_id);

CREATE INDEX IF NOT EXISTS idx_batches_tutor_archived
  ON public.batches(tutor_id, is_archived);

-- ── doubts ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_doubts_tutor_id
  ON public.doubts(tutor_id);

-- ── doubt_messages ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_doubt_messages_doubt_id
  ON public.doubt_messages(doubt_id);

-- ── assignments ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assignments_tutor_id
  ON public.assignments(tutor_id);

CREATE INDEX IF NOT EXISTS idx_assignments_batch_id
  ON public.assignments(batch_id);

-- ── exams ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exams_tutor_id
  ON public.exams(tutor_id);

-- ── tutor_notices ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tutor_notices_tutor_id
  ON public.tutor_notices(tutor_id);

-- ── center_notices ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_center_notices_coaching_center_id
  ON public.center_notices(coaching_center_id);

CREATE INDEX IF NOT EXISTS idx_center_notices_owner_uid
  ON public.center_notices(owner_uid);

-- ── events ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_tutor_id
  ON public.events(tutor_id);

CREATE INDEX IF NOT EXISTS idx_events_batch_id
  ON public.events(batch_id);

-- ── notes (uses user_id, not tutor_id) ───────────────────────
CREATE INDEX IF NOT EXISTS idx_notes_user_id
  ON public.notes(user_id);

-- ── conversations ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_tutor_id
  ON public.conversations(tutor_id);

-- ── notifications (read status filter) ───────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON public.notifications(user_id, is_read);

-- ── user_permissions ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id
  ON public.user_permissions(user_id);

-- ── profiles ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_tutor_id
  ON public.profiles(tutor_id) WHERE tutor_id IS NOT NULL;

-- ── tutors ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tutors_user_id
  ON public.tutors(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tutors_coaching_center_id
  ON public.tutors(coaching_center_id) WHERE coaching_center_id IS NOT NULL;
