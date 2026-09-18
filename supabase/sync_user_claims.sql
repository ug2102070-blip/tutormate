-- ============================================================
-- TutorMate: Zero-Latency Auth (Custom JWT Claims)
-- Syncs role-critical claims to auth.users.raw_app_meta_data
-- allowing the server to verify roles in <1ms without DB calls.
--
-- Claims synced:
--   role        — from profiles.role
--   tutorId     — from profiles.tutor_id (tutor) or students.tutor_id (student)
--   studentDocId— from students.id (student role only)
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_user_claims()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claims     jsonb;
  v_tutor_id   UUID;
  v_student_id UUID;
BEGIN
  -- Only sync if role is present to avoid corrupting metadata
  IF new.role IS NOT NULL THEN
    v_tutor_id := new.tutor_id;

    -- For student role, look up tutorId and studentDocId from the students table
    -- because profiles.tutor_id is not set for students (they link via students.tutor_id)
    IF new.role = 'student' THEN
      SELECT id, tutor_id INTO v_student_id, v_tutor_id
      FROM public.students
      WHERE auth_uid = new.id
      LIMIT 1;
    END IF;

    v_claims := jsonb_build_object(
      'role',        new.role,
      'tutorId',     v_tutor_id,
      'studentDocId', v_student_id  -- NULL for non-student roles, ignored by fast path
    );

    -- Update auth.users metadata directly
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || v_claims
    WHERE id = new.id;
  END IF;

  RETURN new;
END;
$$;

-- Trigger for Profiles (Primary role source)
DROP TRIGGER IF EXISTS on_profile_sync_claims ON public.profiles;
CREATE TRIGGER on_profile_sync_claims
  AFTER INSERT OR UPDATE OF role, tutor_id, student_doc_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_claims();

-- ============================================================
-- Run this once to backfill existing student app_metadata:
-- UPDATE public.profiles SET updated_at = NOW() WHERE role = 'student';
-- ============================================================

