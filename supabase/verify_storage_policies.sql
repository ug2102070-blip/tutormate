-- ==============================================================================
-- TutorMate Storage Policy Verification Script
-- Run in Supabase SQL Editor to confirm phase0 path-ownership policies are live.
-- Safe to run at any time — READ ONLY (all SELECTs).
-- ==============================================================================

-- 1. Check that RLS is ENABLED on storage.objects
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'objects';
-- Expected: rls_enabled = true

-- 2. List current storage policies for the 'attachments' bucket
SELECT
  policyname,
  cmd,
  qual        AS using_condition,
  with_check  AS with_check_condition,
  roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename  = 'objects'
ORDER BY policyname;
-- Expected output (policies set by phase0_fix_rls_policies.sql):
--  policyname                  | cmd    | using_condition                                                  | with_check_condition
--  Attachment delete access    | DELETE | (bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) | null
--  Attachment insert access    | INSERT | null                                                             | (bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
--  Attachment update access    | UPDATE | (bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) | null

-- 3. Confirm no blanket USING (true) policies exist on storage.objects
SELECT COUNT(*) AS dangerous_blanket_policies
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename  = 'objects'
  AND (qual = 'true' OR with_check = 'true');
-- Expected: 0

-- ==============================================================================
-- RE-APPLY STORAGE POLICIES (if verification shows they are missing)
-- Copy the block below and run ONLY if any of the above checks fail.
-- ==============================================================================
/*
DO  BEGIN
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

    -- No SELECT policy needed: public bucket URLs work without auth
  END IF;
END ;
*/
