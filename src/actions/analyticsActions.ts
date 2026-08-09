"use server";

import { verifyUserAuth } from "@/lib/authHelpers";
import { createAdminClient } from "@/lib/supabase/server";

export interface DashboardMetrics {
  activeStudents: number;
  activeBatches: number;
  monthlyRevenue: number;
  pendingFeeAmount: number;
  attendancePercentage: number;
  pendingDoubts: number;
  ungradedSubmissions: number;
}

export interface MonthlyIncomeData {
  monthLabel: string;
  amount: number;
}

export interface FeeDistributionData {
  status: "paid" | "partial" | "unpaid";
  count: number;
  totalAmount: number;
}

export interface AttendanceTrendData {
  weekLabel: string;
  percentage: number;
}

export interface GradeDistributionData {
  grade: string;
  count: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor") {
    return {
      activeStudents: 0,
      activeBatches: 0,
      monthlyRevenue: 0,
      pendingFeeAmount: 0,
      attendancePercentage: 0,
      pendingDoubts: 0,
      ungradedSubmissions: 0,
    };
  }

  const tutorId = authState.tutorId || authState.uid;
  const adminSupabase = createAdminClient();

  // Try the RPC function first (single round-trip instead of 6+ queries).
  // Falls back to parallel queries if the SQL migration hasn't been run yet.
  try {
    const { data: rpcData, error: rpcError } = await adminSupabase
      .rpc("get_tutor_dashboard_metrics", { p_tutor_id: tutorId });

    if (!rpcError && rpcData) {
      return {
        activeStudents:       Number(rpcData.activeStudents)       || 0,
        activeBatches:        Number(rpcData.activeBatches)        || 0,
        monthlyRevenue:       Number(rpcData.monthlyRevenue)       || 0,
        pendingFeeAmount:     Number(rpcData.pendingFeeAmount)     || 0,
        attendancePercentage: Number(rpcData.attendancePercentage) ?? 100,
        pendingDoubts:        Number(rpcData.pendingDoubts)        || 0,
        ungradedSubmissions:  Number(rpcData.ungradedSubmissions)  || 0,
      };
    }
  } catch {
    // RPC not available yet — fall through to manual queries below
  }

  // ── Fallback: original parallel queries ─────────────────────────────────────
  const [
    studentsRes,
    batchesRes,
    feesRes,
    attendanceRes,
    doubtsRes,
    assignmentsRes,
  ] = await Promise.all([
    adminSupabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("tutor_id", tutorId)
      .eq("status", "active"),
    adminSupabase
      .from("batches")
      .select("id", { count: "exact", head: true })
      .eq("tutor_id", tutorId)
      .eq("is_archived", false),
    adminSupabase
      .from("fees")
      .select("amount_paid, amount_due, status, month, year")
      .eq("tutor_id", tutorId),
    adminSupabase
      .from("attendance")
      .select("status")
      .eq("tutor_id", tutorId),
    adminSupabase
      .from("doubts")
      .select("id", { count: "exact", head: true })
      .eq("tutor_id", tutorId)
      .eq("status", "pending"),
    adminSupabase
      .from("assignments")
      .select("id")
      .eq("tutor_id", tutorId),
  ]);

  const activeStudents = studentsRes.count || 0;
  const activeBatches = batchesRes.count || 0;
  const pendingDoubts = doubtsRes.count || 0;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let monthlyRevenue = 0;
  let pendingFeeAmount = 0;

  if (feesRes.data) {
    feesRes.data.forEach((fee) => {
      const paid = Number(fee.amount_paid) || 0;
      const due = Number(fee.amount_due) || 0;
      if (fee.month === currentMonth && fee.year === currentYear) {
        monthlyRevenue += paid;
      }
      if (fee.status !== "paid") {
        pendingFeeAmount += Math.max(0, due - paid);
      }
    });
  }

  let attendancePercentage = 100;
  if (attendanceRes.data && attendanceRes.data.length > 0) {
    const presentCount = attendanceRes.data.filter((a) => a.status === "present").length;
    attendancePercentage = Math.round((presentCount / attendanceRes.data.length) * 100);
  }

  let ungradedSubmissions = 0;
  if (assignmentsRes.data && assignmentsRes.data.length > 0) {
    const assignmentIds = assignmentsRes.data.map((a) => a.id);
    const { count } = await adminSupabase
      .from("assignment_submissions")
      .select("id", { count: "exact", head: true })
      .in("assignment_id", assignmentIds)
      .eq("status", "submitted");
    ungradedSubmissions = count || 0;
  }

  return {
    activeStudents,
    activeBatches,
    monthlyRevenue,
    pendingFeeAmount,
    attendancePercentage,
    pendingDoubts,
    ungradedSubmissions,
  };
}


export async function getMonthlyIncomeChart(months = 6): Promise<MonthlyIncomeData[]> {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor") return [];

  const tutorId = authState.tutorId || authState.uid;
  const adminSupabase = createAdminClient();

  const { data: fees } = await adminSupabase
    .from("fees")
    .select("amount_paid, month, year, created_at")
    .eq("tutor_id", tutorId);

  // Generate last N months labels
  const result: MonthlyIncomeData[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString("default", { month: "short" });
    const fullMonthName = d.toLocaleString("default", { month: "long" });
    const year = d.getFullYear();

    const monthFees = fees?.filter(
      (f) => (f.month === fullMonthName || f.month === monthName) && f.year === year
    ) || [];

    const totalPaid = monthFees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0);

    result.push({
      monthLabel: `${monthName} ${year % 100}`,
      amount: totalPaid,
    });
  }

  return result;
}

export async function getFeeDistribution(month?: string, year?: number): Promise<FeeDistributionData[]> {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor") return [];

  const tutorId = authState.tutorId || authState.uid;
  const adminSupabase = createAdminClient();

  let query = adminSupabase.from("fees").select("status, amount_paid, amount_due").eq("tutor_id", tutorId);
  if (month) query = query.eq("month", month);
  if (year) query = query.eq("year", year);

  const { data: fees } = await query;

  const paidItem = { status: "paid" as const, count: 0, totalAmount: 0 };
  const partialItem = { status: "partial" as const, count: 0, totalAmount: 0 };
  const unpaidItem = { status: "unpaid" as const, count: 0, totalAmount: 0 };

  fees?.forEach((fee) => {
    const paid = Number(fee.amount_paid) || 0;
    const due = Number(fee.amount_due) || 0;

    if (fee.status === "paid") {
      paidItem.count += 1;
      paidItem.totalAmount += paid;
    } else if (fee.status === "partial") {
      partialItem.count += 1;
      partialItem.totalAmount += paid;
    } else {
      unpaidItem.count += 1;
      unpaidItem.totalAmount += due;
    }
  });

  return [paidItem, partialItem, unpaidItem];
}

export async function getAttendanceTrend(batchId?: string): Promise<AttendanceTrendData[]> {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor") return [];

  const tutorId = authState.tutorId || authState.uid;
  const adminSupabase = createAdminClient();

  // Only fetch last 28 days — avoids pulling all historical records
  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
  const dateFilter = twentyEightDaysAgo.toISOString().split("T")[0];

  let query = adminSupabase
    .from("attendance")
    .select("date, status")
    .eq("tutor_id", tutorId)
    .gte("date", dateFilter);
  if (batchId) query = query.eq("batch_id", batchId);

  const { data: records } = await query;

  if (!records || records.length === 0) {
    return [
      { weekLabel: "W1", percentage: 100 },
      { weekLabel: "W2", percentage: 100 },
      { weekLabel: "W3", percentage: 100 },
      { weekLabel: "W4", percentage: 100 },
    ];
  }

  // Group by week offset (last 4 weeks)
  const now = new Date();
  const weeks: { label: string; present: number; total: number }[] = [
    { label: "3 Wks Ago", present: 0, total: 0 },
    { label: "2 Wks Ago", present: 0, total: 0 },
    { label: "Last Week", present: 0, total: 0 },
    { label: "This Week", present: 0, total: 0 },
  ];

  records.forEach((r) => {
    const rDate = new Date(r.date);
    const diffDays = Math.floor((now.getTime() - rDate.getTime()) / (1000 * 3600 * 24));
    
    let weekIndex = -1;
    if (diffDays <= 7) weekIndex = 3;
    else if (diffDays <= 14) weekIndex = 2;
    else if (diffDays <= 21) weekIndex = 1;
    else if (diffDays <= 28) weekIndex = 0;

    if (weekIndex !== -1) {
      weeks[weekIndex].total += 1;
      if (r.status === "present") weeks[weekIndex].present += 1;
    }
  });

  return weeks.map((w) => ({
    weekLabel: w.label,
    percentage: w.total > 0 ? Math.round((w.present / w.total) * 100) : 100,
  }));
}

export async function getGradeDistribution(): Promise<GradeDistributionData[]> {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor") return [];

  const tutorId = authState.tutorId || authState.uid;
  const adminSupabase = createAdminClient();

  const { data: exams } = await adminSupabase.from("exams").select("id").eq("tutor_id", tutorId);
  if (!exams || exams.length === 0) {
    return [
      { grade: "A+", count: 0 },
      { grade: "A", count: 0 },
      { grade: "B", count: 0 },
      { grade: "C", count: 0 },
      { grade: "D", count: 0 },
      { grade: "F", count: 0 },
    ];
  }

  const examIds = exams.map((e) => e.id);
  const { data: results } = await adminSupabase
    .from("exam_results")
    .select("grade")
    .in("exam_id", examIds);

  const gradeCounts: Record<string, number> = { "A+": 0, A: 0, B: 0, C: 0, D: 0, F: 0 };

  results?.forEach((r) => {
    if (r.grade && gradeCounts[r.grade] !== undefined) {
      gradeCounts[r.grade] += 1;
    }
  });

  return Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count }));
}
