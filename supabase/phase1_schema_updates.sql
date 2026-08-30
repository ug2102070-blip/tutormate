-- ==============================================================================
-- TutorMate: Phase 1 Schema Updates
--
-- Run this in Supabase SQL Editor AFTER phase0_fix_rls_policies.sql.
-- Safe to run multiple times (idempotent).
--
-- Covers:
--   1. Add updated_at to students, batches, exams, assignments
--   2. Auto-trigger: set updated_at on every UPDATE
--   3. Create attendance_records normalized table (JSONB → rows)
--   4. Backfill existing JSONB attendance data into attendance_records
--   5. Add sync trigger: keep batch_enrollments in sync with enrolled_batch_ids
--   6. Add onboarding_dismissed_at to tutors table
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- HELPER: Generic updated_at trigger function
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. ADD updated_at COLUMNS
-- ──────────────────────────────────────────────────────────────────────────────

-- students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill from created_at for existing rows
UPDATE public.students SET updated_at = created_at WHERE updated_at = now() AND created_at < now();

DROP TRIGGER IF EXISTS students_updated_at ON public.students;
CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- batches
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.batches SET updated_at = created_at WHERE updated_at = now() AND created_at < now();

DROP TRIGGER IF EXISTS batches_updated_at ON public.batches;
CREATE TRIGGER batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- exams
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.exams SET updated_at = created_at WHERE updated_at = now() AND created_at < now();

DROP TRIGGER IF EXISTS exams_updated_at ON public.exams;
CREATE TRIGGER exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- assignments
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.assignments SET updated_at = created_at WHERE updated_at = now() AND created_at < now();

DROP TRIGGER IF EXISTS assignments_updated_at ON public.assignments;
CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. ADD onboarding_dismissed_at to tutors
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMPTZ;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. CREATE NORMALIZED attendance_records TABLE
-- ──────────────────────────────────────────────────────────────────────────────
-- Replaces: attendance.records JSONB -> { [studentId]: { status, remarks } }
-- New model: one row per student per date per batch

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  tutor_id    UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  batch_id    UUID NOT NULL,
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  remarks     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attendance_id, student_id)
);

-- Index for fast lookups by tutor/date and student
CREATE INDEX IF NOT EXISTS idx_attendance_records_tutor_date
  ON public.attendance_records (tutor_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student
  ON public.attendance_records (student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_batch_date
  ON public.attendance_records (batch_id, date);

-- Updated_at trigger
DROP TRIGGER IF EXISTS attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
CREATE POLICY "attendance_records_select"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR student_id IN (SELECT id FROM public.students WHERE auth_uid = auth.uid())
  );

DROP POLICY IF EXISTS "attendance_records_insert" ON public.attendance_records;
CREATE POLICY "attendance_records_insert"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "attendance_records_update" ON public.attendance_records;
CREATE POLICY "attendance_records_update"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "attendance_records_delete" ON public.attendance_records;
CREATE POLICY "attendance_records_delete"
  ON public.attendance_records FOR DELETE TO authenticated
  USING (tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. BACKFILL: attendance JSONB → attendance_records rows
-- ──────────────────────────────────────────────────────────────────────────────
-- For each existing attendance row, expand the JSONB records object into rows.
-- Runs only for rows not already backfilled (idempotent via ON CONFLICT DO NOTHING).

DO $$
DECLARE
  att_row RECORD;
  student_entry RECORD;
  student_status TEXT;
  student_remarks TEXT;
BEGIN
  FOR att_row IN
    SELECT id, tutor_id, batch_id, date, records
    FROM public.attendance
    WHERE records IS NOT NULL AND records != '{}'::jsonb
  LOOP
    FOR student_entry IN
      SELECT key AS student_id, value AS rec
      FROM jsonb_each(att_row.records)
    LOOP
      BEGIN
        student_status := (student_entry.rec ->> 'status');
        student_remarks := (student_entry.rec ->> 'remarks');

        -- Only insert if student exists and status is valid
        IF student_status IN ('present', 'absent', 'late') THEN
          INSERT INTO public.attendance_records
            (attendance_id, tutor_id, batch_id, student_id, date, status, remarks)
          VALUES (
            att_row.id,
            att_row.tutor_id,
            att_row.batch_id,
            student_entry.student_id::UUID,
            att_row.date,
            student_status,
            student_remarks
          )
          ON CONFLICT (attendance_id, student_id) DO NOTHING;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Skip rows with invalid student UUIDs or constraint violations
        CONTINUE;
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. batch_enrollments SYNC: keep in sync with enrolled_batch_ids
-- ──────────────────────────────────────────────────────────────────────────────
-- When a student's enrolled_batch_ids array changes, auto-sync batch_enrollments.
-- This is the bridge between the legacy array and the normalized junction table.

CREATE OR REPLACE FUNCTION public.sync_batch_enrollments_from_student()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  batch_uuid UUID;
  new_ids UUID[];
  old_ids UUID[];
BEGIN
  -- Normalize arrays (handle NULL)
  new_ids := COALESCE(NEW.enrolled_batch_ids, ARRAY[]::UUID[]);
  old_ids := COALESCE(OLD.enrolled_batch_ids, ARRAY[]::UUID[]);

  -- INSERT new enrollments (in new_ids but not old_ids)
  FOREACH batch_uuid IN ARRAY new_ids LOOP
    IF NOT (batch_uuid = ANY(old_ids)) THEN
      INSERT INTO public.batch_enrollments (student_id, batch_id, enrolled_at)
      VALUES (NEW.id, batch_uuid, now())
      ON CONFLICT (student_id, batch_id) DO UPDATE SET
        status = 'active',
        updated_at = now();
    END IF;
  END LOOP;

  -- SOFT-DELETE removed enrollments (in old_ids but not new_ids)
  FOREACH batch_uuid IN ARRAY old_ids LOOP
    IF NOT (batch_uuid = ANY(new_ids)) THEN
      UPDATE public.batch_enrollments
      SET status = 'removed', updated_at = now()
      WHERE student_id = NEW.id AND batch_id = batch_uuid;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Only create on UPDATE (INSERT is handled by application code in syncBatchEnrollments)
DROP TRIGGER IF EXISTS sync_batch_enrollments_trigger ON public.students;
CREATE TRIGGER sync_batch_enrollments_trigger
  AFTER UPDATE OF enrolled_batch_ids ON public.students
  FOR EACH ROW
  WHEN (OLD.enrolled_batch_ids IS DISTINCT FROM NEW.enrolled_batch_ids)
  EXECUTE FUNCTION public.sync_batch_enrollments_from_student();

-- Backfill batch_enrollments from existing student records (idempotent)
-- Cast text[] → uuid[] explicitly; skip malformed entries via a subquery filter.
INSERT INTO public.batch_enrollments (student_id, batch_id, enrolled_at)
SELECT
  s.id                             AS student_id,
  unnest(s.enrolled_batch_ids)::UUID AS batch_id,
  s.created_at                     AS enrolled_at
FROM public.students s
WHERE s.enrolled_batch_ids IS NOT NULL
  AND array_length(s.enrolled_batch_ids, 1) > 0
ON CONFLICT (student_id, batch_id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ──────────────────────────────────────────────────────────────────────────────
-- Run after migration to verify:
--
-- SELECT COUNT(*) FROM public.attendance_records;  -- should match total JSONB entries
-- SELECT COUNT(*) FROM public.batch_enrollments;   -- should be ≥ sum of enrolled_batch_ids
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name IN ('students','batches','exams','assignments')
--   AND column_name = 'updated_at';               -- should show 4 rows
