"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";

export async function getOnboardingStatus() {
  try {
    const authState = await verifyUserAuth();
    if (!hasRoleAtLeast(authState.role, "tutor")) {
      return null;
    }
    const tutorId = authState.tutorId || authState.uid;
    const adminSupabase = createAdminClient();

    const {
      count: batchCount
    } = await adminSupabase.from("batches").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId);

    const {
      count: studentCount
    } = await adminSupabase.from("students").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId);

    const {
      count: attendanceCount
    } = await adminSupabase.from("attendance").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId);

    const {
      count: feeCount
    } = await adminSupabase.from("fees").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId);

    const {
      count: doubtCount
    } = await adminSupabase.from("doubts").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId);

    return {
      profile: true,
      batch: (batchCount || 0) > 0,
      invite: (studentCount || 0) > 0,
      attendance: (attendanceCount || 0) > 0,
      fee: (feeCount || 0) > 0,
      doubt: (doubtCount || 0) > 0,
    };
  } catch (err) {
    console.error("Error fetching onboarding status:", err);
    return null;
  }
}

export async function getStudentDashboardStats() {
  try {
    const authState = await verifyUserAuth();
    if (authState.role !== "student" || !authState.studentDocId || !authState.tutorId) {
      return null;
    }

    const adminSupabase = createAdminClient();
    const studentId = authState.studentDocId;
    const tutorId = authState.tutorId;

    // 1. Get enrolled batches
    const { data: student } = await adminSupabase
      .from("students")
      .select("enrolled_batch_ids")
      .eq("id", studentId)
      .single();
    
    const enrolledBatches = student?.enrolled_batch_ids || [];

    // 2. Pending Assignments Count
    const { count: pendingAssignments } = await adminSupabase
      .from("assignment_submissions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "pending");

    // 3. Unpaid Fees Amount
    const { data: fees } = await adminSupabase
      .from("fees")
      .select("amount, paid_amount")
      .eq("student_id", studentId)
      .eq("status", "pending");
      
    const unpaidFeesAmount = (fees || []).reduce((acc, fee) => acc + (fee.amount - (fee.paid_amount || 0)), 0);

    // 4. Attendance Rate (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: attendanceRecords } = await adminSupabase
      .from("attendance")
      .select("records")
      .in("batch_id", enrolledBatches)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

    let present = 0;
    let total = 0;
    
    if (attendanceRecords) {
      for (const att of attendanceRecords) {
        const record = (att.records as any)?.[studentId];
        if (record) {
          total++;
          if (record.status === "present") present++;
        }
      }
    }
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null;

    // 5. Recent Notice
    let recentNotice = null;
    const { data: notices } = await adminSupabase
      .from("notices")
      .select("title, type, created_at, audience")
      .eq("tutor_id", tutorId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (notices) {
      recentNotice = notices.find(n => n.audience === 'all' || n.audience === 'students') || null;
    }

    return {
      pendingAssignments: pendingAssignments || 0,
      unpaidFeesAmount,
      attendanceRate,
      recentNotice,
    };
  } catch (err) {
    console.error("Error fetching student dashboard stats:", err);
    return null;
  }
}
