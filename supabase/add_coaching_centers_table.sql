-- ==============================================================================
-- Migration: Add coaching_centers table with 'code' column & link tutors
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 1. Create the coaching_centers table (no-op if already exists)
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

-- 2. If the table already existed WITHOUT these columns, add them safely
ALTER TABLE public.coaching_centers ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.coaching_centers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.coaching_centers ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.coaching_centers ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Ensure existing rows without a code get a placeholder so we can enforce NOT NULL
UPDATE public.coaching_centers
SET code = 'CC-' || UPPER(SUBSTRING(id::text, 1, 6))
WHERE code IS NULL;

-- Enforce NOT NULL on code
ALTER TABLE public.coaching_centers ALTER COLUMN code SET NOT NULL;

-- Add unique constraint if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'coaching_centers_code_key'
      AND conrelid = 'public.coaching_centers'::regclass
  ) THEN
    ALTER TABLE public.coaching_centers ADD CONSTRAINT coaching_centers_code_key UNIQUE (code);
  END IF;
END $$;

-- 3. Add coaching_center_id column to tutors (if not already present)
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS coaching_center_id UUID REFERENCES public.coaching_centers(id) ON DELETE SET NULL;

-- 4. Row Level Security
ALTER TABLE public.coaching_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public coaching_centers" ON public.coaching_centers;
CREATE POLICY "Public coaching_centers"
  ON public.coaching_centers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_coaching_centers_code
  ON public.coaching_centers (code);

CREATE INDEX IF NOT EXISTS idx_coaching_centers_owner
  ON public.coaching_centers (owner_uid);

CREATE INDEX IF NOT EXISTS idx_tutors_coaching_center
  ON public.tutors (coaching_center_id);

-- 6. Fix FK constraint: ensure owner_uid has ON DELETE CASCADE
--    (Repairs live databases where the constraint was created without CASCADE)
DO $$
BEGIN
  -- Drop the old constraint if it exists (with or without CASCADE)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'coaching_centers_owner_uid_fkey'
      AND conrelid = 'public.coaching_centers'::regclass
  ) THEN
    ALTER TABLE public.coaching_centers
      DROP CONSTRAINT coaching_centers_owner_uid_fkey;
  END IF;

  -- Re-add the constraint WITH ON DELETE CASCADE
  ALTER TABLE public.coaching_centers
    ADD CONSTRAINT coaching_centers_owner_uid_fkey
      FOREIGN KEY (owner_uid)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
END $$;

-- 7. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- Verification queries (run separately to confirm success):
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'coaching_centers'
-- ORDER BY ordinal_position;
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'tutors'
--   AND column_name = 'coaching_center_id';
--
-- Verify CASCADE is set:
-- SELECT conname, confdeltype
-- FROM pg_constraint
-- WHERE conname = 'coaching_centers_owner_uid_fkey';
-- (confdeltype = 'c' means CASCADE ✓)
-- ==============================================================================
