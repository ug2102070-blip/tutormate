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

// ─── DASHBOARD LIVE DATA ──────────────────────────────────────────────────────
// Replaces all hardcoded fake arrays in DashboardClientUI.tsx

export interface DashboardScheduleClass {
  id: string;
  batchName: string;
  subject: string;
  gradeClass: string;
  scheduleDays: string[];
  studentsCount: number;
  batchId: string;
}

export interface DashboardUpcomingExam {
  id: string;
  title: string;
  batchName: string;
  examDate: string;
  totalMarks: number;
  passMarks: number | null;
  daysUntil: number;
}

export interface DashboardActiveAssignment {
  id: string;
  title: string;
  batchName: string;
  deadline: string;
  submittedCount: number;
  totalStudents: number;
  batchId: string;
}

export interface DashboardRecentMaterial {
  id: string;
  title: string;
  batchName: string;
  fileType: string;
  fileSize: number | null;
  createdAt: string;
}

export interface DashboardRecentDoubt {
  id: string;
  studentName: string;
  batchName: string;
  title: string;
  timeAgo: string;
  status: string;
}

export interface DashboardLiveData {
  todayBatches: DashboardScheduleClass[];
  upcomingExams: DashboardUpcomingExam[];
  activeAssignments: DashboardActiveAssignment[];
  recentMaterials: DashboardRecentMaterial[];
  recentDoubts: DashboardRecentDoubt[];
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Fetches real dashboard live data for the authenticated tutor.
 * Replaces all hardcoded fake data in DashboardClientUI.tsx.
 *
 * Returns empty arrays gracefully for new tutors with no data.
 */
export async function getDashboardLiveData(): Promise<DashboardLiveData> {
  const empty: DashboardLiveData = {
    todayBatches: [],
    upcomingExams: [],
    activeAssignments: [],
    recentMaterials: [],
    recentDoubts: [],
  };

  try {
    const authState = await verifyUserAuth();
    if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
      return empty;
    }

    const tutorId = authState.tutorId || authState.uid;
    const supabase = createAdminClient();
    const todayName = DAYS_OF_WEEK[new Date().getDay()];
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Fetch all data in parallel — single round trip with Promise.all
    const [batchesRes, examsRes, assignmentsRes, materialsRes, doubtsRes] = await Promise.all([
      // Active batches with schedule
      supabase
        .from("batches")
        .select("id, name, subject, grade_class, schedule, student_count")
        .eq("tutor_id", tutorId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false }),

      // Upcoming exams in next 14 days
      supabase
        .from("exams")
        .select("id, title, exam_date, total_marks, pass_marks, batches(name)")
        .eq("tutor_id", tutorId)
        .gte("exam_date", todayISO)
        .lte("exam_date", in14Days)
        .order("exam_date", { ascending: true })
        .limit(5),

      // Active assignments (published, deadline not expired)
      supabase
        .from("assignments")
        .select(`
          id, title, deadline, batch_id,
          batches(name, student_count),
          assignment_submissions(id, status)
        `)
        .eq("tutor_id", tutorId)
        .eq("is_published", true)
        .gte("deadline", now.toISOString())
        .order("deadline", { ascending: true })
        .limit(5),

      // Recent study materials
      supabase
        .from("materials")
        .select("id, title, file_type, file_size, created_at, batches(name)")
        .eq("tutor_id", tutorId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(4),

      // Recent pending doubts
      supabase
        .from("doubts")
        .select("id, student_name, title, status, last_message_at, batches(name)")
        .eq("tutor_id", tutorId)
        .in("status", ["pending", "answered"])
        .order("last_message_at", { ascending: false })
        .limit(3),
    ]);

    // ── Today's batches: filter by schedule days ──────────────────────────────
    const todayBatches: DashboardScheduleClass[] = [];
    for (const b of batchesRes.data ?? []) {
      const schedule: Array<{ day?: string; days?: string[] }> = b.schedule ?? [];
      const scheduleDays = schedule.flatMap((s) =>
        s.day ? [s.day] : Array.isArray(s.days) ? s.days : []
      );
      if (
        scheduleDays.length === 0 ||
        scheduleDays.some(
          (d: string) => d.toLowerCase() === todayName.toLowerCase()
        )
      ) {
        todayBatches.push({
          id: b.id,
          batchName: b.name,
          subject: b.subject,
          gradeClass: b.grade_class,
          scheduleDays,
          studentsCount: b.student_count ?? 0,
          batchId: b.id,
        });
      }
    }

    // ── Upcoming exams ────────────────────────────────────────────────────────
    const upcomingExams: DashboardUpcomingExam[] = (examsRes.data ?? []).map((e: any) => {
      const batchInfo = Array.isArray(e.batches) ? e.batches[0] : e.batches;
      const examDate = new Date(e.exam_date);
      const daysUntil = Math.ceil(
        (examDate.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
      );
      return {
        id: e.id,
        title: e.title,
        batchName: batchInfo?.name ?? "General",
        examDate: e.exam_date,
        totalMarks: Number(e.total_marks),
        passMarks: e.pass_marks !== null ? Number(e.pass_marks) : null,
        daysUntil: Math.max(0, daysUntil),
      };
    });

    // ── Active assignments ────────────────────────────────────────────────────
    const activeAssignments: DashboardActiveAssignment[] = (assignmentsRes.data ?? []).map(
      (a: any) => {
        const batchInfo = Array.isArray(a.batches) ? a.batches[0] : a.batches;
        const subs: any[] = a.assignment_submissions ?? [];
        const submittedCount = subs.filter(
          (s) => s.status === "submitted" || s.status === "graded"
        ).length;
        return {
          id: a.id,
          title: a.title,
          batchName: batchInfo?.name ?? "General",
          deadline: a.deadline,
          submittedCount,
          totalStudents: batchInfo?.student_count ?? 0,
          batchId: a.batch_id,
        };
      }
    );

    // ── Recent materials ──────────────────────────────────────────────────────
    const recentMaterials: DashboardRecentMaterial[] = (materialsRes.data ?? []).map((m: any) => {
      const batchInfo = Array.isArray(m.batches) ? m.batches[0] : m.batches;
      return {
        id: m.id,
        title: m.title,
        batchName: batchInfo?.name ?? "All Batches",
        fileType: m.file_type,
        fileSize: m.file_size,
        createdAt: m.created_at,
      };
    });

    // ── Recent doubts ─────────────────────────────────────────────────────────
    const recentDoubts: DashboardRecentDoubt[] = (doubtsRes.data ?? []).map((d: any) => {
      const batchInfo = Array.isArray(d.batches) ? d.batches[0] : d.batches;
      return {
        id: d.id,
        studentName: d.student_name,
        batchName: batchInfo?.name ?? "General",
        title: d.title,
        timeAgo: formatTimeAgo(d.last_message_at || d.created_at),
        status: d.status,
      };
    });

    return {
      todayBatches,
      upcomingExams,
      activeAssignments,
      recentMaterials,
      recentDoubts,
    };
  } catch (err) {
    console.error("[getDashboardLiveData] Error:", err);
    return empty;
  }
}
