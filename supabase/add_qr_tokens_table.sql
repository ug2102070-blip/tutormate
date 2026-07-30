-- ==============================================================================
-- Migration: Add qr_tokens table and scan_method column to attendance
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor → New Query
-- ==============================================================================

-- 1. Create the qr_tokens table (no-op if it already exists)
CREATE TABLE IF NOT EXISTS public.qr_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id    UUID        NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  batch_id    UUID        NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  token       TEXT        NOT NULL UNIQUE,
  short_code  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  is_used     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. If the table already existed WITHOUT these columns, add them safely
--    (ADD COLUMN IF NOT EXISTS is a no-op when the column already exists)
ALTER TABLE public.qr_tokens ADD COLUMN IF NOT EXISTS short_code  TEXT;
ALTER TABLE public.qr_tokens ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;
ALTER TABLE public.qr_tokens ADD COLUMN IF NOT EXISTS is_used     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.qr_tokens ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Enforce NOT NULL on short_code now that all rows are guaranteed to have it
--    (Safe because qr_tokens is a session table — existing rows (if any) should be purged)
UPDATE public.qr_tokens SET short_code = '000000' WHERE short_code IS NULL;
ALTER TABLE public.qr_tokens ALTER COLUMN short_code SET NOT NULL;

-- 4. Index for fast lookups by batch + date
CREATE INDEX IF NOT EXISTS idx_qr_tokens_batch_date
  ON public.qr_tokens (batch_id, date);

-- 5. Index for student PIN lookup (now guaranteed safe -- short_code exists)
CREATE INDEX IF NOT EXISTS idx_qr_tokens_short_code
  ON public.qr_tokens (short_code);

-- 6. Add scan_method column to attendance (if it doesn't already exist)
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS scan_method TEXT DEFAULT 'manual';

-- 7. Row Level Security (RLS) for qr_tokens
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;

-- Allow tutors to manage their own QR tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'qr_tokens'
      AND policyname = 'Tutors can manage their qr_tokens'
  ) THEN
    CREATE POLICY "Tutors can manage their qr_tokens"
      ON public.qr_tokens
      FOR ALL
      USING (
        tutor_id IN (
          SELECT id FROM public.tutors WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow students to read active (non-expired, non-used) QR tokens for scanning
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'qr_tokens'
      AND policyname = 'Students can read active qr_tokens'
  ) THEN
    CREATE POLICY "Students can read active qr_tokens"
      ON public.qr_tokens
      FOR SELECT
      USING (
        is_used = false
        AND expires_at > NOW()
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'student'
        )
      );
  END IF;
END $$;

-- Allow service role (admin client) unrestricted access (used by server actions)
-- This is handled automatically by the service_role key -- no extra policy needed.

-- ==============================================================================
-- Verification query (run separately to confirm success):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'qr_tokens'
-- ORDER BY ordinal_position;
-- ==============================================================================
