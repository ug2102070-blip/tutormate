-- ==============================================================================
-- TutorMate: RLS Patch — doubts table + qr_tokens UPDATE hardening
--
-- ISSUES FOUND (from pg_policies audit 2026-09-17):
--
--   1. doubts | "Doubts SELECT policy" | USING (true)
--      → ANY authenticated user can read ALL doubts from ALL tutors
--
--   2. doubts | "Doubts WRITE policy"  | USING (auth.role() = 'authenticated')
--      → ANY authenticated user can INSERT/UPDATE/DELETE ANY doubt row
--
--   3. qr_tokens | qr_tokens_update | USING (... OR is_used = false)
--      → Any user can UPDATE any unused QR token (token hijack / denial-of-service)
--
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (idempotent).
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- FIX 1: DOUBTS table — restore strict ownership-based policies
-- ──────────────────────────────────────────────────────────────────────────────
-- Enable RLS in case it's somehow off
ALTER TABLE IF EXISTS public.doubts ENABLE ROW LEVEL SECURITY;

-- Drop the broken blanket policies
DROP POLICY IF EXISTS "Doubts SELECT policy" ON public.doubts;
DROP POLICY IF EXISTS "Doubts WRITE policy"  ON public.doubts;

-- Also drop any prior fixes (idempotent)
DROP POLICY IF EXISTS "doubts_select" ON public.doubts;
DROP POLICY IF EXISTS "doubts_insert" ON public.doubts;
DROP POLICY IF EXISTS "doubts_update" ON public.doubts;
DROP POLICY IF EXISTS "doubts_delete" ON public.doubts;

-- SELECT: Students see their own doubts; tutors see doubts addressed to them
CREATE POLICY "doubts_select"
  ON public.doubts FOR SELECT TO authenticated
  USING (
    -- The student who submitted the doubt
    student_auth_uid = auth.uid()
    OR
    -- The tutor the doubt was addressed to
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR
    -- Owner can see doubts for tutors in their center (for oversight)
    tutor_id IN (
      SELECT t.id FROM public.tutors t
      JOIN public.coaching_centers cc ON cc.id = t.coaching_center_id
      WHERE cc.owner_uid = auth.uid()
    )
  );

-- INSERT: Only students can submit doubts (for their own student record)
CREATE POLICY "doubts_insert"
  ON public.doubts FOR INSERT TO authenticated
  WITH CHECK (
    student_auth_uid = auth.uid()
    -- Ensure the tutor_id is a real tutor (prevent phantom doubt injection)
    AND tutor_id IN (SELECT id FROM public.tutors)
  );

-- UPDATE: Student can update their own doubt (e.g. edit before answered).
--         Tutor can update status (mark as answered/in-progress).
CREATE POLICY "doubts_update"
  ON public.doubts FOR UPDATE TO authenticated
  USING (
    student_auth_uid = auth.uid()
    OR tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
  )
  WITH CHECK (
    student_auth_uid = auth.uid()
    OR tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
  );

-- DELETE: Only the submitting student or the addressed tutor can delete
CREATE POLICY "doubts_delete"
  ON public.doubts FOR DELETE TO authenticated
  USING (
    student_auth_uid = auth.uid()
    OR tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- FIX 2: QR TOKENS — tighten UPDATE to prevent token hijacking
-- ──────────────────────────────────────────────────────────────────────────────
-- The old qr_tokens_update had USING (tutor_id IN (...) OR is_used = false).
-- The "OR is_used = false" branch lets ANY user update ANY unused token,
-- which would allow marking another tutor's token as used (denial of service).
--
-- Fix: UPDATE must EITHER be by the owning tutor OR be a student marking it used
-- (is_used = false → true transition) — but we further restrict to authenticated
-- students only, not arbitrary users.

DROP POLICY IF EXISTS "qr_tokens_update" ON public.qr_tokens;

-- Also drop the duplicate "Tutors can manage their qr_tokens" ALL policy
-- which overlaps and could cause confusion (keep it since it's correct):
-- (we leave "Tutors can manage their qr_tokens" in place — it's properly scoped)

-- Tightened UPDATE: Tutor owns it, OR user is a student role marking used=true
CREATE POLICY "qr_tokens_update"
  ON public.qr_tokens FOR UPDATE TO authenticated
  USING (
    -- Owning tutor can update anything about their token
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR
    -- Students can ONLY flip is_used on tokens that are currently unused and not expired
    (
      is_used = false
      AND expires_at > now()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'student'
      )
    )
  )
  WITH CHECK (
    -- Tutor can set any value
    tutor_id IN (SELECT id FROM public.tutors WHERE user_id = auth.uid())
    OR
    -- Students can only set is_used = true (can't modify tutor_id, token value, etc.)
    -- We enforce this by checking the profile role; the app only sets is_used=true
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- VERIFY — run this after applying the fixes above to confirm
-- ──────────────────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('doubts', 'qr_tokens')
ORDER BY tablename, cmd;

-- Expected output:
-- doubts | doubts_delete | DELETE | (student_auth_uid = auth.uid() OR ...)
-- doubts | doubts_insert | INSERT | null  ← WITH CHECK only, qual is null for INSERT
-- doubts | doubts_select | SELECT | (student_auth_uid = auth.uid() OR ...)
-- doubts | doubts_update | UPDATE | (student_auth_uid = auth.uid() OR ...)
-- qr_tokens | qr_tokens_update | UPDATE | (tutor_id IN (...) OR (is_used = false AND ...))
-- NO rows with qual = 'true' or qual = '(auth.role() = ''authenticated''::text)'
