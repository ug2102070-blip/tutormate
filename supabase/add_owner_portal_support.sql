-- ==============================================================================
-- Migration: Owner Portal Support
-- Ensures the 'owner' role is properly supported in profiles and RLS policies.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard -> SQL Editor
-- ==============================================================================

-- 1. Ensure profiles table allows 'owner' role
-- (This is likely already the case but re-applied safely)
DO $$
BEGIN
  -- Drop the existing check constraint if it doesn't include 'owner'
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('tutor', 'student', 'admin', 'parent', 'owner'));

-- 2. Ensure coaching_centers table exists with all required columns
-- (idempotent — won't fail if already exists)
CREATE TABLE IF NOT EXISTS public.coaching_centers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  address       TEXT,
  contact_phone TEXT,
  logo_url      TEXT,
  code          TEXT        UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add coaching_center_id to tutors if missing
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS coaching_center_id UUID
  REFERENCES public.coaching_centers(id) ON DELETE SET NULL;

-- 4. RLS: coaching_centers — owner has full CRUD, everyone else can read
ALTER TABLE public.coaching_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_full_access_coaching_centers" ON public.coaching_centers;
CREATE POLICY "owner_full_access_coaching_centers"
  ON public.coaching_centers
  FOR ALL
  TO authenticated
  USING (
    -- Owner can see and manage their own center
    owner_uid = auth.uid()
    OR
    -- Tutors can see the center they belong to
    id IN (
      SELECT coaching_center_id FROM public.tutors
      WHERE user_id = auth.uid() AND coaching_center_id IS NOT NULL
    )
  )
  WITH CHECK (owner_uid = auth.uid());

-- 5. RLS: tutors — owner can read all tutors in their center
DROP POLICY IF EXISTS "owner_read_center_tutors" ON public.tutors;
CREATE POLICY "owner_read_center_tutors"
  ON public.tutors
  FOR SELECT
  TO authenticated
  USING (
    -- Tutor owns this row
    user_id = auth.uid()
    OR id = auth.uid()
    OR
    -- Center owner can read all tutors in their center
    coaching_center_id IN (
      SELECT id FROM public.coaching_centers
      WHERE owner_uid = auth.uid()
    )
  );

-- 6. RLS: owner can read batches across their center's tutors
DROP POLICY IF EXISTS "owner_read_center_batches" ON public.batches;
CREATE POLICY "owner_read_center_batches"
  ON public.batches
  FOR SELECT
  TO authenticated
  USING (
    -- Original tutor owns the batch
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid() OR id = auth.uid()
    )
    OR
    -- Center owner can see all batches of tutors in their center
    tutor_id IN (
      SELECT t.id FROM public.tutors t
      JOIN public.coaching_centers cc ON cc.id = t.coaching_center_id
      WHERE cc.owner_uid = auth.uid()
    )
  );

-- 7. RLS: owner can read students across their center's tutors
DROP POLICY IF EXISTS "owner_read_center_students" ON public.students;
CREATE POLICY "owner_read_center_students"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    -- Original tutor owns the student
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid() OR id = auth.uid()
    )
    OR
    -- Student's own auth_uid
    auth_uid = auth.uid()
    OR
    -- Center owner can see all students of tutors in their center
    tutor_id IN (
      SELECT t.id FROM public.tutors t
      JOIN public.coaching_centers cc ON cc.id = t.coaching_center_id
      WHERE cc.owner_uid = auth.uid()
    )
  );

-- 8. RLS: owner can read fees across their center's tutors
DROP POLICY IF EXISTS "owner_read_center_fees" ON public.fees;
CREATE POLICY "owner_read_center_fees"
  ON public.fees
  FOR SELECT
  TO authenticated
  USING (
    -- Original tutor
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid() OR id = auth.uid()
    )
    OR
    -- Student's own fees
    student_id IN (
      SELECT id FROM public.students WHERE auth_uid = auth.uid()
    )
    OR
    -- Center owner
    tutor_id IN (
      SELECT t.id FROM public.tutors t
      JOIN public.coaching_centers cc ON cc.id = t.coaching_center_id
      WHERE cc.owner_uid = auth.uid()
    )
  );

-- 9. RLS: owner can read attendance across their center's tutors
DROP POLICY IF EXISTS "owner_read_center_attendance" ON public.attendance;
CREATE POLICY "owner_read_center_attendance"
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    -- Original tutor
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid() OR id = auth.uid()
    )
    OR
    -- Center owner
    tutor_id IN (
      SELECT t.id FROM public.tutors t
      JOIN public.coaching_centers cc ON cc.id = t.coaching_center_id
      WHERE cc.owner_uid = auth.uid()
    )
  );

-- 10. Performance indexes for owner queries
CREATE INDEX IF NOT EXISTS idx_coaching_centers_owner_uid
  ON public.coaching_centers (owner_uid);

CREATE INDEX IF NOT EXISTS idx_tutors_coaching_center_id
  ON public.tutors (coaching_center_id);

CREATE INDEX IF NOT EXISTS idx_fees_tutor_year_month
  ON public.fees (tutor_id, year, month);

CREATE INDEX IF NOT EXISTS idx_attendance_tutor_date
  ON public.attendance (tutor_id, date);

-- 11. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- Verification:
-- SELECT role, COUNT(*) FROM public.profiles GROUP BY role;
-- SELECT id, name, code, owner_uid FROM public.coaching_centers;
-- ==============================================================================
