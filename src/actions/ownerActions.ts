"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import type { CoachingCenterDoc, CenterTutorDoc, CenterAnalyticsDoc } from "@/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifies the requesting user is an owner of a coaching center.
 * If no coaching center exists yet for this owner, automatically creates one.
 * Returns { uid, centerId, center }.
 */
async function requireOwner() {
  const auth = await verifyUserAuth();

  // FIX (Phase 0): Explicit role check BEFORE any center lookup.
  // Previously this function only checked if a coaching_center row
  // existed — allowing a non-owner who was somehow linked to a center
  // to gain full owner-level access. Now we enforce the role at the
  // auth layer first.
  if (auth.role !== "owner" && auth.role !== "admin") {
    throw new Error(
      "Unauthorized: Only coaching center owners can access this resource."
    );
  }

  const adminSupabase = createAdminClient();

  // 1. Check if coaching center already exists for this owner
  const { data: existingCenter } = await adminSupabase
    .from("coaching_centers")
    .select("*")
    .eq("owner_uid", auth.uid)
    .maybeSingle();

  if (existingCenter) {
    return { uid: auth.uid, centerId: existingCenter.id as string, center: existingCenter };
  }

  // 2. If no center exists, auto-initialize one so owner portal works seamlessly
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", auth.uid)
    .maybeSingle();

  const { data: tutor } = await adminSupabase
    .from("tutors")
    .select("full_name, institution")
    .eq("id", auth.uid)
    .maybeSingle();

  const displayName =
    tutor?.full_name ||
    profile?.display_name ||
    profile?.email?.split("@")[0] ||
    "Owner";

  const centerName =
    tutor?.institution &&
    tutor.institution.trim() &&
    tutor.institution.trim() !== "Independent"
      ? tutor.institution.trim()
      : `${displayName}'s Coaching Center`;

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let joinCode = "CC-";
  for (let i = 0; i < 6; i++) {
    joinCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const { data: newCenter, error: createErr } = await adminSupabase
    .from("coaching_centers")
    .insert({
      owner_uid: auth.uid,
      name: centerName,
      code: joinCode,
    })
    .select("*")
    .single();

  if (createErr || !newCenter) {
    console.error("[requireOwner] Auto center creation failed:", createErr);
    throw new Error("Access denied. Could not initialize coaching center.");
  }

  // Link tutor record to the newly created center if tutor record exists
  await adminSupabase
    .from("tutors")
    .update({ coaching_center_id: newCenter.id })
    .eq("id", auth.uid);

  // Ensure profile role is owner
  await adminSupabase
    .from("profiles")
    .update({ role: "owner" })
    .eq("id", auth.uid);

  return { uid: auth.uid, centerId: newCenter.id as string, center: newCenter };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface OwnerDashboardStats {
  centerName: string;
  centerCode: string;
  totalTutors: number;
  totalStudents: number;
  totalBatches: number;
  monthlyRevenue: number;
  pendingFees: number;
  attendanceRate: number;
  recentTutors: { fullName: string; batchCount: number; studentCount: number; joinedAt: string }[];
  monthlyRevenueTrend: { month: string; revenue: number }[];
}

export async function getOwnerDashboardStats(): Promise<OwnerDashboardStats> {
  const { centerId, center } = await requireOwner();
  const adminSupabase = createAdminClient();

  // All tutors in center
  const { data: tutors } = await adminSupabase
    .from("tutors")
    .select("id, full_name, created_at")
    .eq("coaching_center_id", centerId)
    .order("created_at", { ascending: false });

  const tutorIds = (tutors ?? []).map((t) => t.id);

  // Total active batches
  const { count: totalBatches } = await adminSupabase
    .from("batches")
    .select("*", { count: "exact", head: true })
    .in("tutor_id", tutorIds.length ? tutorIds : ["__none__"])
    .eq("is_archived", false);

  // Total active students
  const { count: totalStudents } = await adminSupabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .in("tutor_id", tutorIds.length ? tutorIds : ["__none__"])
    .eq("status", "active");

  // Monthly revenue (current month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: feeRows } = await adminSupabase
    .from("fees")
    .select("amount_paid, amount_due")
    .in("tutor_id", tutorIds.length ? tutorIds : ["__none__"])
    .eq("year", currentYear)
    .eq("month", currentMonth);

  const monthlyRevenue = (feeRows ?? []).reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
  const pendingFees = (feeRows ?? []).reduce((sum, r) => sum + (Math.max(0, (Number(r.amount_due) || 0) - (Number(r.amount_paid) || 0))), 0);

  // Attendance rate (current month)
  const startDateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const { data: attRows } = await adminSupabase
    .from("attendance")
    .select("records")
    .in("tutor_id", tutorIds.length ? tutorIds : ["__none__"])
    .gte("date", startDateStr);

  let presentCount = 0;
  let totalCount = 0;
  for (const row of attRows ?? []) {
    const recs = row.records as Record<string, { status: string }>;
    if (recs && typeof recs === "object") {
      Object.values(recs).forEach((r) => {
        totalCount++;
        if (r.status === "present" || r.status === "late") presentCount++;
      });
    }
  }
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

  // Per-tutor quick stats (recent 5) — FIX: batch fetch instead of per-tutor loop
  const top5TutorIds = (tutors ?? []).slice(0, 5).map((t) => t.id);
  const [{ data: top5Batches }, { data: top5Students }] = await Promise.all([
    adminSupabase
      .from("batches")
      .select("tutor_id")
      .in("tutor_id", top5TutorIds.length ? top5TutorIds : ["__none__"])
      .eq("is_archived", false),
    adminSupabase
      .from("students")
      .select("tutor_id")
      .in("tutor_id", top5TutorIds.length ? top5TutorIds : ["__none__"])
      .eq("status", "active"),
  ]);

  // Count per tutor in JS — O(n) instead of O(n * 2 queries)
  const batchCountByTutor = new Map<string, number>();
  const studentCountByTutor = new Map<string, number>();
  for (const b of top5Batches ?? []) {
    batchCountByTutor.set(b.tutor_id, (batchCountByTutor.get(b.tutor_id) ?? 0) + 1);
  }
  for (const s of top5Students ?? []) {
    studentCountByTutor.set(s.tutor_id, (studentCountByTutor.get(s.tutor_id) ?? 0) + 1);
  }

  const recentTutors: OwnerDashboardStats["recentTutors"] = (tutors ?? []).slice(0, 5).map((t) => ({
    fullName: t.full_name,
    batchCount: batchCountByTutor.get(t.id) ?? 0,
    studentCount: studentCountByTutor.get(t.id) ?? 0,
    joinedAt: t.created_at,
  }));

  // Revenue trend — last 6 months — FIX: single date-range query, group in JS
  const trendStart = new Date(currentYear, currentMonth - 1 - 5, 1);
  const trendStartYear = trendStart.getFullYear();
  const trendStartMonth = trendStart.getMonth() + 1;

  const { data: trendFees } = await adminSupabase
    .from("fees")
    .select("year, month, amount_paid")
    .in("tutor_id", tutorIds.length ? tutorIds : ["__none__"])
    .gte("year", trendStartYear)
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  // Build a map of "YYYY-MM" → total revenue
  const trendMap = new Map<string, number>();
  for (const row of trendFees ?? []) {
    const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
    trendMap.set(key, (trendMap.get(key) ?? 0) + (Number(row.amount_paid) || 0));
  }

  const monthlyRevenueTrend: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = d.toLocaleString("default", { month: "short", year: "2-digit" });
    // Filter out months before trendStartYear/Month to avoid partial data from wrong year
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const isInRange =
      y > trendStartYear || (y === trendStartYear && m >= trendStartMonth);
    monthlyRevenueTrend.push({ month: monthLabel, revenue: isInRange ? (trendMap.get(key) ?? 0) : 0 });
  }

  return {
    centerName: center.name,
    centerCode: center.code,
    totalTutors: (tutors ?? []).length,
    totalStudents: totalStudents ?? 0,
    totalBatches: totalBatches ?? 0,
    monthlyRevenue,
    pendingFees,
    attendanceRate,
    recentTutors,
    monthlyRevenueTrend,
  };
}

// ─── Tutors ───────────────────────────────────────────────────────────────────

export interface OwnerTutorRow {
  tutorId: string;
  userId: string | null;
  fullName: string;
  institution: string;
  contactPhone: string;
  batchCount: number;
  studentCount: number;
  monthlyRevenue: number;
  joinedAt: string;
}

export async function getOwnerTutors(): Promise<OwnerTutorRow[]> {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  const { data: tutors } = await adminSupabase
    .from("tutors")
    .select("id, user_id, full_name, institution, contact_phone, created_at")
    .eq("coaching_center_id", centerId)
    .order("created_at", { ascending: false });

  if (!tutors || tutors.length === 0) return [];

  const tutorIds = tutors.map((t) => t.id);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // FIX: 3 bulk queries instead of 3 * N sequential queries
  const [{ data: allBatches }, { data: allStudents }, { data: allFees }] = await Promise.all([
    adminSupabase
      .from("batches")
      .select("tutor_id")
      .in("tutor_id", tutorIds)
      .eq("is_archived", false),
    adminSupabase
      .from("students")
      .select("tutor_id")
      .in("tutor_id", tutorIds)
      .eq("status", "active"),
    adminSupabase
      .from("fees")
      .select("tutor_id, amount_paid")
      .in("tutor_id", tutorIds)
      .eq("year", currentYear)
      .eq("month", currentMonth),
  ]);

  // Aggregate in JS — O(n) instead of O(n * 3 queries)
  const batchCountByTutor = new Map<string, number>();
  const studentCountByTutor = new Map<string, number>();
  const revenueByTutor = new Map<string, number>();

  for (const b of allBatches ?? []) {
    batchCountByTutor.set(b.tutor_id, (batchCountByTutor.get(b.tutor_id) ?? 0) + 1);
  }
  for (const s of allStudents ?? []) {
    studentCountByTutor.set(s.tutor_id, (studentCountByTutor.get(s.tutor_id) ?? 0) + 1);
  }
  for (const f of allFees ?? []) {
    revenueByTutor.set(f.tutor_id, (revenueByTutor.get(f.tutor_id) ?? 0) + (Number(f.amount_paid) || 0));
  }

  return tutors.map((t) => ({
    tutorId: t.id,
    userId: t.user_id,
    fullName: t.full_name,
    institution: t.institution,
    contactPhone: t.contact_phone,
    batchCount: batchCountByTutor.get(t.id) ?? 0,
    studentCount: studentCountByTutor.get(t.id) ?? 0,
    monthlyRevenue: revenueByTutor.get(t.id) ?? 0,
    joinedAt: t.created_at,
  }));
}

export async function removeTutorFromCenterByOwner(targetTutorId: string) {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  await adminSupabase
    .from("tutors")
    .update({ coaching_center_id: null })
    .eq("id", targetTutorId)
    .eq("coaching_center_id", centerId);

  return { success: true };
}

// ─── Students ─────────────────────────────────────────────────────────────────

export interface OwnerStudentRow {
  studentId: string;
  fullName: string;
  phone: string;
  institution: string | null;
  tutorName: string;
  enrolledBatchIds: string[];
  feeStatus: "paid" | "unpaid" | "partial" | "none";
  status: "active" | "archived";
  createdAt: string;
}

export async function getOwnerStudents(
  page = 1,
  pageSize = 100
): Promise<{ rows: OwnerStudentRow[]; total: number }> {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  const { data: tutors } = await adminSupabase
    .from("tutors")
    .select("id, full_name")
    .eq("coaching_center_id", centerId);

  if (!tutors || tutors.length === 0) return { rows: [], total: 0 };

  const tutorMap = new Map(tutors.map((t) => [t.id, t.full_name]));
  const tutorIds = tutors.map((t) => t.id);

  const now = new Date();
  const offset = (page - 1) * pageSize;

  // Paginated student fetch
  const { data: students, count: totalCount } = await adminSupabase
    .from("students")
    .select("id, full_name, phone, institution, tutor_id, enrolled_batch_ids, status, created_at", {
      count: "exact",
    })
    .in("tutor_id", tutorIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (!students || students.length === 0) return { rows: [], total: totalCount ?? 0 };

  const studentIds = students.map((s) => s.id);

  // FIX: Single bulk fee query instead of 1-per-student
  const { data: feeRows } = await adminSupabase
    .from("fees")
    .select("student_id, status")
    .in("student_id", studentIds)
    .eq("year", now.getFullYear())
    .eq("month", now.getMonth() + 1);

  // Build student_id → fee status map (latest record wins)
  const feeStatusByStudent = new Map<string, string>();
  for (const f of feeRows ?? []) {
    feeStatusByStudent.set(f.student_id, f.status);
  }

  const rows: OwnerStudentRow[] = students.map((s) => ({
    studentId: s.id,
    fullName: s.full_name,
    phone: s.phone,
    institution: s.institution,
    tutorName: tutorMap.get(s.tutor_id) ?? "Unknown",
    enrolledBatchIds: s.enrolled_batch_ids ?? [],
    feeStatus: (feeStatusByStudent.get(s.id) as OwnerStudentRow["feeStatus"]) ?? "none",
    status: s.status as "active" | "archived",
    createdAt: s.created_at,
  }));

  return { rows, total: totalCount ?? 0 };
}

// ─── Batches ──────────────────────────────────────────────────────────────────

export interface OwnerBatchRow {
  batchId: string;
  tutorName: string;
  name: string;
  subject: string;
  gradeClass: string;
  monthlyFee: number;
  studentCount: number;
  isArchived: boolean;
  createdAt: string;
}

export async function getOwnerBatches(
  page = 1,
  pageSize = 100
): Promise<{ rows: OwnerBatchRow[]; total: number }> {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  const { data: tutors } = await adminSupabase
    .from("tutors")
    .select("id, full_name")
    .eq("coaching_center_id", centerId);

  if (!tutors || tutors.length === 0) return { rows: [], total: 0 };

  const tutorMap = new Map(tutors.map((t) => [t.id, t.full_name]));
  const tutorIds = tutors.map((t) => t.id);
  const offset = (page - 1) * pageSize;

  const { data: batches, count: totalCount } = await adminSupabase
    .from("batches")
    .select(
      "id, tutor_id, name, subject, grade_class, monthly_fee, student_count, is_archived, created_at",
      { count: "exact" }
    )
    .in("tutor_id", tutorIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const rows = (batches ?? []).map((b) => ({
    batchId: b.id,
    tutorName: tutorMap.get(b.tutor_id) ?? "Unknown",
    name: b.name,
    subject: b.subject,
    gradeClass: b.grade_class,
    monthlyFee: Number(b.monthly_fee),
    studentCount: b.student_count ?? 0,
    isArchived: b.is_archived,
    createdAt: b.created_at,
  }));

  return { rows, total: totalCount ?? 0 };
}

// ─── Fee Report ───────────────────────────────────────────────────────────────

export interface OwnerFeeRow {
  tutorName: string;
  totalDue: number;
  totalPaid: number;
  totalPending: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
}

export async function getOwnerFeeReport(year?: number, month?: number): Promise<OwnerFeeRow[]> {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;

  const { data: tutors } = await adminSupabase
    .from("tutors")
    .select("id, full_name")
    .eq("coaching_center_id", centerId);

  if (!tutors || tutors.length === 0) return [];

  const tutorIds = tutors.map((t) => t.id);
  const tutorNameMap = new Map(tutors.map((t) => [t.id, t.full_name]));

  // FIX: Single bulk query instead of 1 query per tutor
  const { data: allFees } = await adminSupabase
    .from("fees")
    .select("tutor_id, amount_due, amount_paid, status")
    .in("tutor_id", tutorIds)
    .eq("year", y)
    .eq("month", m);

  // Group fees by tutor_id in JS
  const feesByTutor = new Map<string, typeof allFees>(
    tutorIds.map((id) => [id, []])
  );
  for (const fee of allFees ?? []) {
    feesByTutor.get(fee.tutor_id)?.push(fee);
  }

  return tutors.map((t) => {
    const fees = feesByTutor.get(t.id) ?? [];
    const totalDue = fees.reduce((s, r) => s + (Number(r.amount_due) || 0), 0);
    const totalPaid = fees.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);
    return {
      tutorName: tutorNameMap.get(t.id) ?? t.full_name,
      totalDue,
      totalPaid,
      totalPending: Math.max(0, totalDue - totalPaid),
      paidCount: fees.filter((r) => r.status === "paid").length,
      unpaidCount: fees.filter((r) => r.status === "unpaid").length,
      partialCount: fees.filter((r) => r.status === "partial").length,
    };
  });
}

// ─── Attendance Summary ───────────────────────────────────────────────────────

export interface OwnerAttendanceRow {
  tutorName: string;
  batchName: string;
  batchId: string;
  date: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalCount: number;
  rate: number;
}

export async function getOwnerAttendanceSummary(days = 7): Promise<OwnerAttendanceRow[]> {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  const { data: tutors } = await adminSupabase
    .from("tutors")
    .select("id, full_name")
    .eq("coaching_center_id", centerId);

  if (!tutors || tutors.length === 0) return [];

  const tutorMap = new Map(tutors.map((t) => [t.id, t.full_name]));
  const tutorIds = tutors.map((t) => t.id);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().slice(0, 10);

  const { data: attRows } = await adminSupabase
    .from("attendance")
    .select("tutor_id, batch_id, date, records")
    .in("tutor_id", tutorIds)
    .gte("date", startDateStr)
    .order("date", { ascending: false });

  if (!attRows || attRows.length === 0) return [];

  // Fetch batch names
  const batchIds = [...new Set(attRows.map((r) => r.batch_id))];
  const { data: batchRows } = await adminSupabase
    .from("batches")
    .select("id, name")
    .in("id", batchIds);
  const batchMap = new Map((batchRows ?? []).map((b) => [b.id, b.name]));

  return attRows.map((row) => {
    const recs = row.records as Record<string, { status: string }>;
    let presentCount = 0, absentCount = 0, lateCount = 0, totalCount = 0;
    if (recs && typeof recs === "object") {
      Object.values(recs).forEach((r) => {
        totalCount++;
        if (r.status === "present") presentCount++;
        else if (r.status === "absent") absentCount++;
        else if (r.status === "late") lateCount++;
      });
    }
    const rate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 100;
    return {
      tutorName: tutorMap.get(row.tutor_id) ?? "Unknown",
      batchName: batchMap.get(row.batch_id) ?? "Unknown Batch",
      batchId: row.batch_id,
      date: row.date,
      presentCount,
      absentCount,
      lateCount,
      totalCount,
      rate,
    };
  });
}

// ─── Center Settings ──────────────────────────────────────────────────────────

export async function getOwnerCenterInfo(): Promise<CoachingCenterDoc | null> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const { data: center } = await adminSupabase
    .from("coaching_centers")
    .select("*")
    .eq("owner_uid", auth.uid)
    .maybeSingle();

  if (!center) return null;

  return {
    id: center.id,
    ownerUid: center.owner_uid,
    name: center.name,
    address: center.address,
    contactPhone: center.contact_phone,
    logoUrl: center.logo_url,
    code: center.code,
    createdAt: center.created_at,
  } as CoachingCenterDoc;
}

export async function updateOwnerCenterInfo(data: {
  name: string;
  address?: string;
  contactPhone?: string;
}) {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  if (!data.name?.trim()) throw new Error("Center name is required.");

  const { error } = await adminSupabase
    .from("coaching_centers")
    .update({
      name: data.name.trim(),
      address: data.address?.trim() ?? null,
      contact_phone: data.contactPhone?.trim() ?? null,
    })
    .eq("id", centerId);

  if (error) throw new Error("Failed to update center info.");
  return { success: true };
}

// ─── Invite Page Stats ─────────────────────────────────────────────────────────

export interface CenterInviteStats {
  tutorCount: number;
  recentTutors: Array<{ id: string; name: string; joinedAt: string }>;
}

/**
 * Returns tutor count and recent joiners for the Invite & QR Code page.
 */
export async function getCenterInviteStats(): Promise<CenterInviteStats> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const { data: center } = await adminSupabase
    .from("coaching_centers")
    .select("id")
    .eq("owner_uid", auth.uid)
    .maybeSingle();

  if (!center) return { tutorCount: 0, recentTutors: [] };

  const { data: tutors } = await adminSupabase
    .from("tutors")
    .select("id, full_name, joined_at, created_at")
    .eq("coaching_center_id", center.id)
    .neq("user_id", auth.uid) // exclude the owner themselves
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    tutorCount: tutors?.length ?? 0,
    recentTutors: (tutors ?? []).map((t) => ({
      id: t.id as string,
      name: (t.full_name as string) || "Tutor",
      joinedAt: (t.joined_at as string) || (t.created_at as string) || new Date().toISOString(),
    })),
  };
}

// ─── Coaching Center Staff Management ──────────────────────────────────────────

export async function getCenterStaff(): Promise<any[]> {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("coaching_staff")
    .select("*")
    .eq("center_id", centerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getCenterStaff] Error:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    centerId: row.center_id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    role: row.role,
    status: row.status,
    joinedDate: row.joined_date || row.created_at?.slice(0, 10),
    createdAt: row.created_at,
  }));
}

export async function createCenterStaff(payload: {
  name: string;
  email: string;
  phone?: string;
  role: "Accountant" | "Receptionist" | "Manager" | "Other";
}) {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  if (!payload.name?.trim() || !payload.email?.trim()) {
    throw new Error("Staff name and email are required.");
  }

  const { data, error } = await adminSupabase
    .from("coaching_staff")
    .insert({
      center_id: centerId,
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone?.trim() || null,
      role: payload.role || "Accountant",
      status: "active",
      joined_date: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create staff member: ${error.message}`);
  }

  return { success: true, data };
}

export async function deleteCenterStaff(staffId: string) {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase
    .from("coaching_staff")
    .delete()
    .eq("id", staffId)
    .eq("center_id", centerId);

  if (error) {
    throw new Error(`Failed to delete staff member: ${error.message}`);
  }

  return { success: true };
}

// ─── Coaching Center Expenses & Payroll Management ─────────────────────────────

export async function getCenterExpenses(): Promise<any[]> {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("coaching_expenses")
    .select("*")
    .eq("center_id", centerId)
    .order("date", { ascending: false });

  if (error) {
    console.error("[getCenterExpenses] Error:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    centerId: row.center_id,
    title: row.title,
    category: row.category,
    amount: Number(row.amount || 0),
    date: row.date,
    paidTo: row.paid_to || "",
    notes: row.notes || "",
    createdAt: row.created_at,
  }));
}

export async function createCenterExpense(payload: {
  title: string;
  category: "Rent" | "Utilities" | "Payroll" | "Marketing" | "Maintenance" | "Other";
  amount: number;
  date?: string;
  paidTo?: string;
  notes?: string;
}) {
  const { uid, centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  if (!payload.title?.trim()) {
    throw new Error("Expense title is required.");
  }
  if (!payload.amount || payload.amount <= 0) {
    throw new Error("Valid expense amount is required.");
  }

  const { data, error } = await adminSupabase
    .from("coaching_expenses")
    .insert({
      center_id: centerId,
      title: payload.title.trim(),
      category: payload.category || "Other",
      amount: payload.amount,
      date: payload.date || new Date().toISOString().slice(0, 10),
      paid_to: payload.paidTo?.trim() || null,
      notes: payload.notes?.trim() || null,
      created_by: uid,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record expense: ${error.message}`);
  }

  return { success: true, data };
}

export async function deleteCenterExpense(expenseId: string) {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase
    .from("coaching_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("center_id", centerId);

  if (error) {
    throw new Error(`Failed to delete expense: ${error.message}`);
  }

  return { success: true };
}

// ─── ADD TUTOR BY PHONE ────────────────────────────────────────────────────────

/**
 * Looks up a registered tutor by contact phone number.
 * Returns their info so the owner can review before adding to the center.
 */
export async function lookupTutorByPhone(phone: string): Promise<{
  found: boolean;
  tutor?: {
    tutorId: string;
    fullName: string;
    institution: string;
    contactPhone: string;
    alreadyInCenter: boolean;
  };
  message?: string;
}> {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  const normalized = phone.replace(/[\s\-()]/g, "");
  const localForm = normalized.replace(/^\+?880?/, "0");

  // Search by contact_phone in tutors table
  const { data: tutors } = await adminSupabase
    .from("tutors")
    .select("id, full_name, institution, contact_phone, coaching_center_id")
    .or(`contact_phone.eq.${normalized},contact_phone.eq.${localForm}`)
    .limit(1);

  const tutor = tutors?.[0];

  if (!tutor) {
    // Try searching profiles table for matching phone
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("id, display_name, phone_number, role")
      .or(`phone_number.eq.${normalized},phone_number.eq.${localForm}`)
      .eq("role", "tutor")
      .limit(1);

    const profile = profiles?.[0];
    if (!profile) {
      return { found: false, message: "এই নম্বরে কোনো tutor পাওয়া যায়নি। তাকে আগে TutorMate-এ register করতে হবে।" };
    }

    // Find tutor record by user_id matching profile id
    const { data: tutorByProfile } = await adminSupabase
      .from("tutors")
      .select("id, full_name, institution, contact_phone, coaching_center_id")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!tutorByProfile) {
      return { found: false, message: "এই নম্বরে কোনো tutor পাওয়া যায়নি।" };
    }

    return {
      found: true,
      tutor: {
        tutorId: tutorByProfile.id,
        fullName: tutorByProfile.full_name,
        institution: tutorByProfile.institution,
        contactPhone: tutorByProfile.contact_phone || normalized,
        alreadyInCenter: tutorByProfile.coaching_center_id === centerId,
      },
    };
  }

  return {
    found: true,
    tutor: {
      tutorId: tutor.id,
      fullName: tutor.full_name,
      institution: tutor.institution,
      contactPhone: tutor.contact_phone,
      alreadyInCenter: tutor.coaching_center_id === centerId,
    },
  };
}

/**
 * Adds a tutor to the owner's coaching center directly (no approval required).
 * Owner has full authority to assign tutors to their center.
 */
export async function addTutorToCenterByPhone(tutorId: string): Promise<{ success: boolean }> {
  const { centerId } = await requireOwner();
  const adminSupabase = createAdminClient();

  // Verify tutor exists
  const { data: tutor, error: fetchErr } = await adminSupabase
    .from("tutors")
    .select("id, coaching_center_id")
    .eq("id", tutorId)
    .single();

  if (fetchErr || !tutor) {
    throw new Error("Tutor not found.");
  }

  if (tutor.coaching_center_id === centerId) {
    throw new Error("এই tutor ইতিমধ্যেই আপনার center-এ আছেন।");
  }

  const { error: updateErr } = await adminSupabase
    .from("tutors")
    .update({ coaching_center_id: centerId })
    .eq("id", tutorId);

  if (updateErr) {
    throw new Error(`Failed to add tutor: ${updateErr.message}`);
  }

  return { success: true };
}
