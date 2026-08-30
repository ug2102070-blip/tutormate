"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import { getTutorId } from "@/lib/enrollment";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StudentProgressReport {
  student: {
    id: string;
    fullName: string;
    phone: string;
    institution: string | null;
    enrolledBatchIds: string[];
    status: string;
    createdAt: string;
  };
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendanceRate: number; // 0-100
    last30DaysRate: number; // 0-100
  };
  fees: {
    totalDue: number;
    totalPaid: number;
    outstanding: number;
    paidCount: number;
    unpaidCount: number;
    lastPaidAt: string | null;
  };
  assignments: {
    total: number;
    submitted: number;
    completionRate: number; // 0-100
  };
  exams: {
    total: number;
    appeared: number;
    averageMarks: number | null;
    averagePercentage: number | null;
    topScore: number | null;
  };
  batchNames: string[];
}

// ─── GET STUDENT PROGRESS REPORT ──────────────────────────────────────────────

/**
 * Fetches a consolidated progress report for a student.
 * Runs 5 parallel DB queries for attendance, fees, assignments, exams, and batches.
 * Authorization: tutor must own the student.
 */
export async function getStudentProgressReport(
  studentId: string
): Promise<StudentProgressReport | null> {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) return null;

  const tutorId = getTutorId(authState);
  const supabase = createAdminClient();

  // Verify ownership
  const { data: student, error: studentErr } = await supabase
    .from("students")
    .select("id, full_name, phone, institution, enrolled_batch_ids, status, created_at")
    .eq("id", studentId)
    .eq("tutor_id", tutorId)
    .single();

  if (studentErr || !student) return null;

  const enrolledBatchIds: string[] = student.enrolled_batch_ids || [];

  // Run all data queries in parallel
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const [
    attendanceRes,
    feesRes,
    assignmentsRes,
    examResultsRes,
    batchNamesRes,
  ] = await Promise.all([
    // Attendance records from the normalized table
    supabase
      .from("attendance_records")
      .select("status, date")
      .eq("student_id", studentId)
      .eq("tutor_id", tutorId),

    // Fees
    supabase
      .from("fees")
      .select("amount_due, amount_paid, status, paid_at")
      .eq("student_id", studentId)
      .eq("tutor_id", tutorId),

    // Assignment submissions — check if student_id is in submitted_by array or a submissions table
    // Fallback: count assignments in enrolled batches
    supabase
      .from("assignments")
      .select("id, due_date")
      .eq("tutor_id", tutorId)
      .in("batch_id", enrolledBatchIds.length > 0 ? enrolledBatchIds : ["__none__"]),

    // Exam results
    supabase
      .from("exam_results")
      .select("marks_obtained, total_marks")
      .eq("student_id", studentId),

    // Batch names
    enrolledBatchIds.length > 0
      ? supabase
          .from("batches")
          .select("name")
          .in("id", enrolledBatchIds)
      : Promise.resolve({ data: [] }),
  ]);

  // ── Attendance ──
  const allAttendance = (attendanceRes.data || []) as Array<{ status: string; date: string }>;
  const last30 = allAttendance.filter((r) => r.date >= thirtyDaysAgoStr);
  const totalDays = allAttendance.length;
  const presentDays = allAttendance.filter((r) => r.status === "present").length;
  const absentDays = allAttendance.filter((r) => r.status === "absent").length;
  const lateDays = allAttendance.filter((r) => r.status === "late").length;
  const last30Present = last30.filter((r) => r.status === "present" || r.status === "late").length;

  const attendance = {
    totalDays,
    presentDays,
    absentDays,
    lateDays,
    attendanceRate: totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0,
    last30DaysRate: last30.length > 0 ? Math.round((last30Present / last30.length) * 100) : 0,
  };

  // ── Fees ──
  const allFees = (feesRes.data || []) as Array<{
    amount_due: number;
    amount_paid: number;
    status: string;
    paid_at: string | null;
  }>;
  const totalDue = allFees.reduce((s, f) => s + Number(f.amount_due), 0);
  const totalPaid = allFees.reduce((s, f) => s + Number(f.amount_paid), 0);
  const paidFees = allFees.filter((f) => f.status === "paid");
  const lastPaidAt = paidFees.length > 0
    ? paidFees.sort((a, b) => (b.paid_at || "").localeCompare(a.paid_at || ""))[0]?.paid_at ?? null
    : null;

  const fees = {
    totalDue,
    totalPaid,
    outstanding: Math.max(0, totalDue - totalPaid),
    paidCount: paidFees.length,
    unpaidCount: allFees.filter((f) => f.status !== "paid").length,
    lastPaidAt,
  };

  // ── Assignments ──
  const totalAssignments = (assignmentsRes.data || []).length;
  const assignments = {
    total: totalAssignments,
    submitted: 0, // Requires a submissions junction table — placeholder for now
    completionRate: 0,
  };

  // ── Exams ──
  const examResults = (examResultsRes.data || []) as Array<{
    marks_obtained: number;
    total_marks: number;
  }>;
  const validResults = examResults.filter((r) => r.total_marks > 0);
  const percentages = validResults.map((r) => (r.marks_obtained / r.total_marks) * 100);
  const avgPercentage =
    percentages.length > 0
      ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
      : null;

  const exams = {
    total: examResults.length,
    appeared: validResults.length,
    averageMarks:
      validResults.length > 0
        ? Math.round(validResults.reduce((s, r) => s + Number(r.marks_obtained), 0) / validResults.length)
        : null,
    averagePercentage: avgPercentage,
    topScore:
      percentages.length > 0 ? Math.round(Math.max(...percentages)) : null,
  };

  // ── Batch names ──
  const batchNames = ((batchNamesRes as { data: Array<{ name: string }> | null }).data || []).map(
    (b) => b.name
  );

  return {
    student: {
      id: student.id,
      fullName: student.full_name,
      phone: student.phone,
      institution: student.institution,
      enrolledBatchIds,
      status: student.status,
      createdAt: student.created_at,
    },
    attendance,
    fees,
    assignments,
    exams,
    batchNames,
  };
}
