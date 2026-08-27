-- ============================================================
-- TutorMate: Dashboard Metrics RPC Function
-- Replaces 6+ separate DB queries with a single round-trip.
-- Run this once in Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION get_tutor_dashboard_metrics(p_tutor_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolved_tutor_id  UUID;
  v_active_students    BIGINT := 0;
  v_active_batches     BIGINT := 0;
  v_pending_doubts     BIGINT := 0;
  v_monthly_revenue    NUMERIC := 0;
  v_pending_fee_amount NUMERIC := 0;
  v_attendance_pct     INT := 100;
  v_ungraded_subs      BIGINT := 0;
  v_total_att          BIGINT := 0;
  v_present_att        BIGINT := 0;
  v_current_month      INT;
  v_current_year       INT;
BEGIN
  -- Resolve actual tutor id in case user_id (auth UID) was passed
  SELECT id INTO v_resolved_tutor_id
  FROM tutors
  WHERE id = p_tutor_id OR user_id = p_tutor_id
  LIMIT 1;

  IF v_resolved_tutor_id IS NULL THEN
    v_resolved_tutor_id := p_tutor_id;
  END IF;

  v_current_month := EXTRACT(MONTH FROM NOW())::INT;
  v_current_year  := EXTRACT(YEAR  FROM NOW())::INT;

  -- Active students
  SELECT COUNT(*) INTO v_active_students
  FROM students
  WHERE tutor_id = v_resolved_tutor_id AND status = 'active';

  -- Active batches
  SELECT COUNT(*) INTO v_active_batches
  FROM batches
  WHERE tutor_id = v_resolved_tutor_id AND is_archived = false;

  -- Pending doubts
  SELECT COUNT(*) INTO v_pending_doubts
  FROM doubts
  WHERE tutor_id = v_resolved_tutor_id AND status = 'pending';

  -- Monthly revenue (current month collected)
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_monthly_revenue
  FROM fees
  WHERE tutor_id = v_resolved_tutor_id
    AND month = v_current_month
    AND year  = v_current_year;

  -- Pending fee amount (all unpaid)
  SELECT COALESCE(SUM(GREATEST(amount_due - amount_paid, 0)), 0) INTO v_pending_fee_amount
  FROM fees
  WHERE tutor_id = v_resolved_tutor_id AND status != 'paid';

  -- Attendance percentage (all time, present/late vs total in JSONB records)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE (elem.value->>'status') IN ('present', 'late'))
  INTO v_total_att, v_present_att
  FROM attendance a,
  LATERAL jsonb_each(a.records) elem
  WHERE a.tutor_id = v_resolved_tutor_id;

  IF v_total_att > 0 THEN
    v_attendance_pct := ROUND((v_present_att::NUMERIC / v_total_att) * 100)::INT;
  END IF;

  -- Ungraded submissions (submitted but not graded)
  SELECT COUNT(*) INTO v_ungraded_subs
  FROM assignment_submissions asub
  INNER JOIN assignments a ON a.id = asub.assignment_id
  WHERE a.tutor_id = v_resolved_tutor_id
    AND asub.status = 'submitted';

  RETURN json_build_object(
    'activeStudents',      v_active_students,
    'activeBatches',       v_active_batches,
    'pendingDoubts',       v_pending_doubts,
    'monthlyRevenue',      v_monthly_revenue,
    'pendingFeeAmount',    v_pending_fee_amount,
    'attendancePercentage', v_attendance_pct,
    'ungradedSubmissions', v_ungraded_subs
  );
END;
$$;

-- Grant execute permission to service role (used by admin client)
GRANT EXECUTE ON FUNCTION get_tutor_dashboard_metrics(UUID) TO service_role;
-- Also grant to authenticated users (for anon client calls)
GRANT EXECUTE ON FUNCTION get_tutor_dashboard_metrics(UUID) TO authenticated;
