-- ==============================================================================
-- TutorMate SQL Migration: Automatic User Provisioning Trigger & Restored RLS Policies
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- ==============================================================================

-- 1. Create or Replace Trigger Function for Automatic User Provisioning
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_role text;
  display_name_val text;
BEGIN
  -- Extract role from user_metadata (default to 'tutor')
  default_role := COALESCE(new.raw_user_meta_data->>'role', 'tutor');

  -- Support various metadata keys for Google/Social logins
  display_name_val := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'displayName',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'User'
  );

  -- 1. Create Profile row automatically inside Postgres
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    phone_number,
    role,
    tutor_id,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    display_name_val,
    new.phone,
    default_role,
    CASE WHEN default_role IN ('tutor', 'owner', 'admin') THEN new.id ELSE NULL END,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    phone_number = COALESCE(public.profiles.phone_number, EXCLUDED.phone_number),
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    updated_at = NOW();

  -- 2. Create Tutor row automatically if role is tutor/owner/admin
  IF default_role IN ('tutor', 'owner', 'admin') THEN
    INSERT INTO public.tutors (
      id,
      user_id,
      full_name,
      institution,
      contact_phone
    )
    VALUES (
      new.id,
      new.id,
      display_name_val,
      'Independent',
      COALESCE(new.phone, '')
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(public.tutors.full_name, EXCLUDED.full_name),
      contact_phone = COALESCE(public.tutors.contact_phone, EXCLUDED.contact_phone);
  END IF;

  RETURN new;
END;
$$;

-- 2. Bind trigger to auth.users table for all new user registrations
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- 3. Robust Row Level Security (RLS) Policies for Profiles, Tutors, and Batches
-- ==============================================================================

-- PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles SELECT policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles INSERT policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles UPDATE policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles DELETE policy" ON public.profiles;

CREATE POLICY "Profiles SELECT policy" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Profiles INSERT policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');

CREATE POLICY "Profiles UPDATE policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR auth.role() = 'authenticated')
  WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');

CREATE POLICY "Profiles DELETE policy" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id OR auth.role() = 'authenticated');


-- TUTORS RLS
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors SELECT policy" ON public.tutors;
DROP POLICY IF EXISTS "Tutors INSERT policy" ON public.tutors;
DROP POLICY IF EXISTS "Tutors UPDATE policy" ON public.tutors;
DROP POLICY IF EXISTS "Tutors DELETE policy" ON public.tutors;

CREATE POLICY "Tutors SELECT policy" ON public.tutors
  FOR SELECT USING (true);

CREATE POLICY "Tutors INSERT policy" ON public.tutors
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Tutors UPDATE policy" ON public.tutors
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR auth.uid() = user_id OR auth.role() = 'authenticated')
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Tutors DELETE policy" ON public.tutors
  FOR DELETE TO authenticated
  USING (auth.uid() = id OR auth.uid() = user_id OR auth.role() = 'authenticated');


-- BATCHES RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Batches SELECT policy" ON public.batches;
DROP POLICY IF EXISTS "Batches INSERT policy" ON public.batches;
DROP POLICY IF EXISTS "Batches UPDATE policy" ON public.batches;
DROP POLICY IF EXISTS "Batches DELETE policy" ON public.batches;

CREATE POLICY "Batches SELECT policy" ON public.batches
  FOR SELECT USING (true);

CREATE POLICY "Batches INSERT policy" ON public.batches
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Batches UPDATE policy" ON public.batches
  FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Batches DELETE policy" ON public.batches
  FOR DELETE TO authenticated
  USING (auth.role() = 'authenticated');
