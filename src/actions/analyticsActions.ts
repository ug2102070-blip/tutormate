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

  // 1. Try Fast RPC First
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

    if (rpcError) {
      console.warn("Dashboard Metrics RPC unavailable, falling back to direct queries:", rpcError.message || JSON.stringify(rpcError));
    }
  } catch (err: any) {
    console.warn("Dashboard Metrics RPC exception, falling back to direct queries:", err?.message || err);
  }

  // 2. Resilient Direct Parallel DB Query Fallback
  try {
    const now = new Date();
    const currentMonthNum = now.getMonth() + 1;
    const currentMonthLong = now.toLocaleString("default", { month: "long" });
    const currentMonthShort = now.toLocaleString("default", { month: "short" });
    const currentYear = now.getFullYear();

    const [
      studentsRes,
      batchesRes,
      doubtsRes,
      feesRes,
      attendanceRes,
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
        .from("doubts")
        .select("id", { count: "exact", head: true })
        .eq("tutor_id", tutorId)
        .eq("status", "pending"),
      adminSupabase
        .from("fees")
        .select("amount_paid, amount_due, status, month, year")
        .eq("tutor_id", tutorId),
      adminSupabase
        .from("attendance")
        .select("records")
        .eq("tutor_id", tutorId),
      adminSupabase
        .from("assignments")
        .select("id")
        .eq("tutor_id", tutorId),
    ]);

    const activeStudents = studentsRes.count || 0;
    const activeBatches = batchesRes.count || 0;
    const pendingDoubts = doubtsRes.count || 0;

    let monthlyRevenue = 0;
    let pendingFeeAmount = 0;

    feesRes.data?.forEach((f) => {
      const isCurrentMonth =
        Number(f.month) === currentMonthNum ||
        f.month === currentMonthLong ||
        f.month === currentMonthShort;

      if (isCurrentMonth && Number(f.year) === currentYear) {
        monthlyRevenue += Number(f.amount_paid) || 0;
      }
      if (f.status !== "paid") {
        const due = Number(f.amount_due) || 0;
        const paid = Number(f.amount_paid) || 0;
        pendingFeeAmount += Math.max(0, due - paid);
      }
    });

    let totalAttendanceRecords = 0;
    let presentAttendanceRecords = 0;

    attendanceRes.data?.forEach((att) => {
      const recs = att.records as Record<string, { status?: string }> | null;
      if (recs && typeof recs === "object") {
        Object.values(recs).forEach((r) => {
          if (r && typeof r === "object") {
            totalAttendanceRecords++;
            if (r.status === "present" || r.status === "late") {
              presentAttendanceRecords++;
            }
          }
        });
      }
    });

    const attendancePercentage =
      totalAttendanceRecords > 0
        ? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100)
        : 100;

    let ungradedSubmissions = 0;
    const assignmentIds = assignmentsRes.data?.map((a) => a.id) || [];
    if (assignmentIds.length > 0) {
      const { count: subsCount } = await adminSupabase
        .from("assignment_submissions")
        .select("id", { count: "exact", head: true })
        .in("assignment_id", assignmentIds)
        .eq("status", "submitted");
      ungradedSubmissions = subsCount || 0;
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
  } catch (err: any) {
    console.error("Dashboard Metrics fallback queries failed:", err?.message || err);
    return {
      activeStudents: 0,
      activeBatches: 0,
      monthlyRevenue: 0,
      pendingFeeAmount: 0,
      attendancePercentage: 100,
      pendingDoubts: 0,
      ungradedSubmissions: 0,
    };
  }
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
    const monthNum = d.getMonth() + 1;
    const year = d.getFullYear();

    const monthFees = fees?.filter(
      (f) =>
        (Number(f.month) === monthNum ||
          f.month === fullMonthName ||
          f.month === monthName) &&
        Number(f.year) === year
    ) || [];

    const totalPaid = monthFees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0);

    result.push({
      monthLabel: `${monthName} ${year % 100}`,
      amount: totalPaid,
    });
  }

  return result;
}

export async function getFeeDistribution(month?: string | number, year?: number): Promise<FeeDistributionData[]> {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor") return [];

  const tutorId = authState.tutorId || authState.uid;
  const adminSupabase = createAdminClient();

  let query = adminSupabase.from("fees").select("status, amount_paid, amount_due").eq("tutor_id", tutorId);
  if (month !== undefined) query = query.eq("month", month);
  if (year !== undefined) query = query.eq("year", year);

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
    .select("date, records")
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
      const recs = r.records as Record<string, { status?: string }> | null;
      if (recs && typeof recs === "object") {
        Object.values(recs).forEach((st) => {
          if (st && typeof st === "object") {
            weeks[weekIndex].total += 1;
            if (st.status === "present" || st.status === "late") {
              weeks[weekIndex].present += 1;
            }
          }
        });
      }
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
