-- ==============================================================================
-- TutorMate: Timetables & Routine Management Schema (Production-Grade)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create Timetables Table
CREATE TABLE IF NOT EXISTS public.timetables (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id       UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  class_id       TEXT NOT NULL,
  academic_year  TEXT NOT NULL DEFAULT '2026-27',
  day            TEXT NOT NULL,
  period_index   INT NOT NULL,
  period_time    TEXT NOT NULL,
  subject        TEXT NOT NULL,
  teacher        TEXT,
  room           TEXT,
  note           TEXT,
  color          TEXT DEFAULT 'blue',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add any new columns to timetables if existing
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'blue';
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Create Timetable Settings Table (Per Class / Academic Year customization)
CREATE TABLE IF NOT EXISTS public.timetable_settings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id       UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  class_id       TEXT NOT NULL,
  academic_year  TEXT NOT NULL DEFAULT '2026-27',
  days           JSONB NOT NULL DEFAULT '["Sunday","Monday","Tuesday","Wednesday","Thursday"]'::jsonb,
  periods        JSONB NOT NULL DEFAULT '["08:00 - 08:45 AM","08:45 - 09:30 AM","09:45 - 10:30 AM","10:30 - 11:15 AM","11:30 - 12:15 PM"]'::jsonb,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tutor_id, class_id, academic_year)
);

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_timetables_tutor_class_year 
  ON public.timetables(tutor_id, class_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_timetables_conflict_check 
  ON public.timetables(tutor_id, day, period_index);

CREATE INDEX IF NOT EXISTS idx_timetable_settings_lookup 
  ON public.timetable_settings(tutor_id, class_id, academic_year);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Timetables
DROP POLICY IF EXISTS "timetables_tutor_select" ON public.timetables;
DROP POLICY IF EXISTS "timetables_tutor_insert" ON public.timetables;
DROP POLICY IF EXISTS "timetables_tutor_update" ON public.timetables;
DROP POLICY IF EXISTS "timetables_tutor_delete" ON public.timetables;
DROP POLICY IF EXISTS "timetables_public_read" ON public.timetables;

-- Tutors can manage their own timetables
CREATE POLICY "timetables_tutor_select"
  ON public.timetables
  FOR SELECT
  TO authenticated
  USING (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'owner', 'student', 'parent')
    )
  );

CREATE POLICY "timetables_tutor_insert"
  ON public.timetables
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "timetables_tutor_update"
  ON public.timetables
  FOR UPDATE
  TO authenticated
  USING (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "timetables_tutor_delete"
  ON public.timetables
  FOR DELETE
  TO authenticated
  USING (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid()
    )
  );

-- 6. RLS Policies for Timetable Settings
DROP POLICY IF EXISTS "timetable_settings_tutor_select" ON public.timetable_settings;
DROP POLICY IF EXISTS "timetable_settings_tutor_insert" ON public.timetable_settings;
DROP POLICY IF EXISTS "timetable_settings_tutor_update" ON public.timetable_settings;
DROP POLICY IF EXISTS "timetable_settings_tutor_delete" ON public.timetable_settings;

CREATE POLICY "timetable_settings_tutor_select"
  ON public.timetable_settings
  FOR SELECT
  TO authenticated
  USING (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'owner', 'student', 'parent')
    )
  );

CREATE POLICY "timetable_settings_tutor_insert"
  ON public.timetable_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "timetable_settings_tutor_update"
  ON public.timetable_settings
  FOR UPDATE
  TO authenticated
  USING (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "timetable_settings_tutor_delete"
  ON public.timetable_settings
  FOR DELETE
  TO authenticated
  USING (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE user_id = auth.uid()
    )
  );
