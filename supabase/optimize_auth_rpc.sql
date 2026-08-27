-- ============================================================
-- TutorMate: Unified Auth Context RPC
-- Reduces 5+ sequential queries to 1 single database call.
-- Returns all profile, role, and permission data for a user.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_auth_context(p_uid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role             TEXT := NULL;
  v_tutor_id         UUID := NULL;
  v_student_doc_id   UUID := NULL;
  v_student_auth_uid UUID := NULL;
  v_email            TEXT := NULL;
  v_permissions      TEXT[] := ARRAY[]::TEXT[];
  v_profile          RECORD;
  v_tutor            RECORD;
  v_student          RECORD;
  v_parent_link      RECORD;
BEGIN
  -- 1. Get profile data
  SELECT * INTO v_profile FROM profiles WHERE id = p_uid LIMIT 1;
  IF FOUND THEN
    v_role := v_profile.role;
    v_email := v_profile.email;
    v_tutor_id := v_profile.tutor_id;
    v_student_doc_id := v_profile.student_doc_id;
  END IF;

  -- 2. Check if user is a tutor directly
  SELECT id INTO v_tutor FROM tutors WHERE user_id = p_uid OR id = p_uid LIMIT 1;
  IF FOUND THEN
    v_role := COALESCE(v_role, 'tutor');
    v_tutor_id := COALESCE(v_tutor_id, v_tutor.id);
  END IF;

  -- 3. Check if user is a student
  IF v_role IS NULL OR v_role = 'student' THEN
    SELECT id, tutor_id INTO v_student FROM students WHERE auth_uid = p_uid OR id = p_uid LIMIT 1;
    IF FOUND THEN
      v_role := 'student';
      v_student_doc_id := v_student.id;
      v_tutor_id := COALESCE(v_tutor_id, v_student.tutor_id);
    END IF;
  END IF;

  -- 4. Check if user is a parent
  IF v_role IS NULL OR v_role = 'parent' THEN
    SELECT pl.student_id, s.auth_uid, s.tutor_id INTO v_parent_link
    FROM parent_links pl
    JOIN students s ON s.id = pl.student_id
    WHERE pl.parent_uid = p_uid LIMIT 1;

    IF FOUND THEN
      v_role := 'parent';
      v_student_doc_id := v_parent_link.student_id;
      v_student_auth_uid := v_parent_link.auth_uid;
      v_tutor_id := COALESCE(v_tutor_id, v_parent_link.tutor_id);
    END IF;
  END IF;

  -- 5. Fetch custom permissions
  SELECT ARRAY_AGG(permission) INTO v_permissions
  FROM user_permissions
  WHERE user_id = p_uid;

  RETURN json_build_object(
    'uid', p_uid,
    'role', v_role,
    'tutorId', v_tutor_id,
    'studentDocId', v_student_doc_id,
    'studentAuthUid', v_student_auth_uid,
    'email', v_email,
    'permissions', COALESCE(v_permissions, ARRAY[]::TEXT[])
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_auth_context(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_auth_context(UUID) TO authenticated;
