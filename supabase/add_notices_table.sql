-- ==============================================================================
-- TutorMate: Add Center Notices & Tutor Notices Tables (Production-Grade)
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- ─── 1. CENTER NOTICES TABLE ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.center_notices (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_center_id UUID        NOT NULL REFERENCES public.coaching_centers(id) ON DELETE CASCADE,
  owner_uid          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  content            TEXT        NOT NULL,
  target             TEXT        NOT NULL DEFAULT 'everyone'
                                   CHECK (target IN ('everyone', 'tutors', 'students')),
  notice_date        DATE        NOT NULL,
  notice_time        TEXT        NOT NULL DEFAULT '09:00',
  is_pinned          BOOLEAN     NOT NULL DEFAULT false,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add new columns to existing tables
ALTER TABLE public.center_notices ADD COLUMN IF NOT EXISTS is_pinned  BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE public.center_notices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 2. TUTOR NOTICES TABLE ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tutor_notices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id    UUID        NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  target      TEXT        NOT NULL DEFAULT 'all'
                            CHECK (target IN ('all', 'students', 'parents')),
  notice_date DATE        NOT NULL,
  notice_time TEXT        NOT NULL DEFAULT '09:00',
  is_pinned   BOOLEAN     NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add new columns to existing tables
ALTER TABLE public.tutor_notices ADD COLUMN IF NOT EXISTS is_pinned  BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE public.tutor_notices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 3. ROW LEVEL SECURITY — CENTER NOTICES ───────────────────────────────────

ALTER TABLE public.center_notices ENABLE ROW LEVEL SECURITY;

-- Drop old open policies
DROP POLICY IF EXISTS "Public center_notices" ON public.center_notices;
DROP POLICY IF EXISTS "center_notices_owner_select" ON public.center_notices;
DROP POLICY IF EXISTS "center_notices_owner_insert" ON public.center_notices;
DROP POLICY IF EXISTS "center_notices_owner_update" ON public.center_notices;
DROP POLICY IF EXISTS "center_notices_owner_delete" ON public.center_notices;
DROP POLICY IF EXISTS "center_notices_tutor_select" ON public.center_notices;

-- Owners can read notices for their own coaching center
CREATE POLICY "center_notices_owner_select"
  ON public.center_notices FOR SELECT
  USING (
    owner_uid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.coaching_centers cc
      WHERE cc.id = center_notices.coaching_center_id
        AND cc.owner_uid = auth.uid()
    )
  );

-- Owners can insert notices only for their own coaching center
CREATE POLICY "center_notices_owner_insert"
  ON public.center_notices FOR INSERT
  WITH CHECK (
    owner_uid = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.coaching_centers cc
      WHERE cc.id = center_notices.coaching_center_id
        AND cc.owner_uid = auth.uid()
    )
  );

-- Owners can only update/pin their own notices
CREATE POLICY "center_notices_owner_update"
  ON public.center_notices FOR UPDATE
  USING (owner_uid = auth.uid())
  WITH CHECK (owner_uid = auth.uid());

-- Owners can only delete their own notices
CREATE POLICY "center_notices_owner_delete"
  ON public.center_notices FOR DELETE
  USING (owner_uid = auth.uid());

-- Tutors can read center notices from their coaching center (target must include tutors)
CREATE POLICY "center_notices_tutor_select"
  ON public.center_notices FOR SELECT
  USING (
    target IN ('everyone', 'tutors')
    AND EXISTS (
      SELECT 1 FROM public.tutors t
      WHERE t.user_id = auth.uid()
        AND t.coaching_center_id = center_notices.coaching_center_id
    )
  );

-- ─── 4. ROW LEVEL SECURITY — TUTOR NOTICES ───────────────────────────────────

ALTER TABLE public.tutor_notices ENABLE ROW LEVEL SECURITY;

-- Drop old open policies
DROP POLICY IF EXISTS "Public tutor_notices" ON public.tutor_notices;
DROP POLICY IF EXISTS "tutor_notices_tutor_all" ON public.tutor_notices;

-- Tutors can read, insert, update, delete their own notices
CREATE POLICY "tutor_notices_tutor_all"
  ON public.tutor_notices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tutors t
      WHERE t.id = tutor_notices.tutor_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tutors t
      WHERE t.id = tutor_notices.tutor_id
        AND t.user_id = auth.uid()
    )
  );

-- ─── 5. PERFORMANCE INDEXES ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_center_notices_center_pinned
  ON public.center_notices(coaching_center_id, is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_center_notices_owner
  ON public.center_notices(owner_uid);

CREATE INDEX IF NOT EXISTS idx_tutor_notices_tutor_pinned
  ON public.tutor_notices(tutor_id, is_pinned DESC, created_at DESC);

-- ─── 6. AUTO-UPDATE updated_at TRIGGER ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_center_notices_updated_at ON public.center_notices;
CREATE TRIGGER trg_center_notices_updated_at
  BEFORE UPDATE ON public.center_notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_tutor_notices_updated_at ON public.tutor_notices;
CREATE TRIGGER trg_tutor_notices_updated_at
  BEFORE UPDATE ON public.tutor_notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 7. RELOAD SCHEMA CACHE ───────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- Verification:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name IN ('center_notices','tutor_notices') ORDER BY table_name, ordinal_position;
--
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename IN ('center_notices','tutor_notices');
-- ==============================================================================
