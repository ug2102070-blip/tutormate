-- ==============================================================================
-- Phone Number Lookup Indexes for Mobile-Based Add Flows
-- Run in Supabase SQL Editor
-- ==============================================================================

-- Fast phone number lookup on profiles (tutor adds student/parent by phone)
CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON public.profiles(phone_number)
  WHERE phone_number IS NOT NULL;

-- Fast phone number lookup on tutors table (owner adds tutor by phone)
CREATE INDEX IF NOT EXISTS idx_tutors_contact_phone
  ON public.tutors(contact_phone)
  WHERE contact_phone IS NOT NULL AND contact_phone != '';

-- Fast phone number lookup on students table (tutor lookup by student phone)
CREATE INDEX IF NOT EXISTS idx_students_phone
  ON public.students(phone)
  WHERE phone IS NOT NULL AND phone != '';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
