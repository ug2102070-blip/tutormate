-- ============================================================
-- TutorMate: Zero-Latency Auth (Custom JWT Claims)
-- Syncs 'role' and 'tutor_id' to auth.users.raw_app_meta_data
-- allows the server to verify roles in <1ms without DB calls.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_user_claims()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claims jsonb;
BEGIN
  -- Build the custom claims object
  -- Only include if role is present to avoid corrupting metadata
  IF new.role IS NOT NULL THEN
    v_claims := jsonb_build_object(
      'role', new.role,
      'tutorId', new.tutor_id
    );

    -- Update auth.users metadata directly
    -- We use the auth schema explicitly
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
  AFTER INSERT OR UPDATE OF role, tutor_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_claims();

-- Optional: Initial migration to sync existing users
-- DO $$
-- BEGIN
--   UPDATE public.profiles SET updated_at = NOW();
-- END $$;
