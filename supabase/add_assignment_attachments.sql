-- ==============================================================================
-- 🚀 TutorMate — Assignment Attachments & Student Notes Migration
-- Adds question paper/worksheet attachment support to assignments
-- and student notes support to assignment submissions.
-- ==============================================================================

-- 1. Add file_path to assignments (optional tutor question sheet / worksheet attachment)
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- 2. Add student_notes to assignment_submissions (optional student comment / solution text)
ALTER TABLE public.assignment_submissions 
ADD COLUMN IF NOT EXISTS student_notes TEXT;

-- 3. Ensure indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_assignments_batch_published 
ON public.assignments(batch_id, is_published);

CREATE INDEX IF NOT EXISTS idx_assignment_subs_student 
ON public.assignment_submissions(student_id, status);

CREATE INDEX IF NOT EXISTS idx_assignment_subs_assignment 
ON public.assignment_submissions(assignment_id, status);
