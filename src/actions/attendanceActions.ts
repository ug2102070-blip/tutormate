"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import { z } from "zod";
import type { AttendanceDoc, AttendanceRecord } from "@/types";

import { revalidatePath } from "next/cache";

const saveAttendanceSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  records: z.record(
    z.string(),
    z.object({
      status: z.enum(["present", "absent", "late"]),
      remarks: z.string().nullable().optional(),
    })
  ),
});

export interface BatchAttendanceOverviewItem {
  id: string;
  name: string;
  gradeClass: string;
  subject: string;
  students: number;
  marked: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
  isMarked: boolean;
}

export interface AttendanceOverviewSummary {
  totalEnrolled: number;
  totalMarked: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  overallRate: number;
}

export interface TutorAttendanceOverviewData {
  batches: BatchAttendanceOverviewItem[];
  summary: AttendanceOverviewSummary;
}

export interface RegisterStudentItem {
  studentId: string;
  rollNo: string;
  fullName: string;
  phone: string;
  guardianPhone: string | null;
  institution: string | null;
  inviteCode: string;
  avatarInitials: string;
  status: "present" | "absent" | "late" | null;
  remarks: string;
}

export interface BatchAttendanceRegisterData {
  batch: {
    id: string;
    name: string;
    gradeClass: string;
    subject: string;
  };
  students: RegisterStudentItem[];
  date: string;
  isMarked: boolean;
}

interface SaveAttendancePayload {
  batchId: string;
  date: string; // YYYY-MM-DD
  records: Record<string, { status: "present" | "absent" | "late"; remarks?: string | null }>;
}

/**
 * Saves or updates attendance record for a batch on a given date in Supabase.
 */
export async function saveAttendance(payload: SaveAttendancePayload) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized: Only tutors can log attendance.");
  }
  const tutorId = authState.tutorId || authState.uid;
  const validated = saveAttendanceSchema.parse(payload);
  const { batchId, date, records } = validated;

  const supabase = createAdminClient();

  // Verify batch ownership
  const { data: batch, error: batchErr } = await supabase
    .from("batches")
    .select("id, tutor_id")
    .eq("id", batchId)
    .single();

  if (batchErr || !batch || batch.tutor_id !== tutorId) {
    throw new Error("Batch not found or unauthorized.");
  }

  const { data: attendance, error } = await supabase
    .from("attendance")
    .upsert(
      {
        tutor_id: tutorId,
        batch_id: batchId,
        date,
        records,
      },
      { onConflict: "batch_id, date" }
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save attendance: ${error.message}`);
  }

  // Invalidate caches across dependent routes
  revalidatePath("/tutor/attendance");
  revalidatePath(`/tutor/attendance/register/${batchId}`);
  revalidatePath("/tutor/dashboard");
  revalidatePath("/student/attendance");
  revalidatePath("/parent/attendance");
  revalidatePath("/owner/attendance");

  return { success: true, attendanceId: attendance.id };
}

/**
 * Fetches attendance overview across all batches for a tutor on a given date.
 */
export async function getTutorAttendanceOverview(
  date: string
): Promise<TutorAttendanceOverviewData> {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized: Only tutors can view attendance overview.");
  }
  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  // 1. Fetch active batches
  const { data: batches = [] } = await supabase
    .from("batches")
    .select("id, name, grade_class, subject, student_count")
    .eq("tutor_id", tutorId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  // 2. Fetch active students to calculate enrollment per batch
  const { data: students = [] } = await supabase
    .from("students")
    .select("id, enrolled_batch_ids, full_name")
    .eq("tutor_id", tutorId)
    .eq("status", "active");

  // 3. Fetch attendance records for this date
  const { data: attendanceRows = [] } = await supabase
    .from("attendance")
    .select("*")
    .eq("tutor_id", tutorId)
    .eq("date", date);

  const attendanceMap = new Map<string, Record<string, AttendanceRecord>>();
  for (const row of attendanceRows || []) {
    attendanceMap.set(row.batch_id, (row.records || {}) as Record<string, AttendanceRecord>);
  }

  let totalMarked = 0;
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;

  const batchItems: BatchAttendanceOverviewItem[] = (batches || []).map((b) => {
    const batchStudents = (students || []).filter((s) =>
      (s.enrolled_batch_ids || []).includes(b.id)
    );
    const enrolledCount = batchStudents.length;
    const batchRecords = attendanceMap.get(b.id);
    const isMarked = Boolean(batchRecords && Object.keys(batchRecords).length > 0);

    let bMarked = 0;
    let bPresent = 0;
    let bAbsent = 0;
    let bLate = 0;

    if (batchRecords) {
      for (const st of batchStudents) {
        const r = batchRecords[st.id];
        if (r && r.status) {
          bMarked++;
          if (r.status === "present") bPresent++;
          else if (r.status === "absent") bAbsent++;
          else if (r.status === "late") bLate++;
        }
      }
    }

    const bRate = bMarked > 0 ? Math.round((bPresent / bMarked) * 100) : 0;

    totalMarked += bMarked;
    totalPresent += bPresent;
    totalAbsent += bAbsent;
    totalLate += bLate;

    return {
      id: b.id,
      name: b.name,
      gradeClass: b.grade_class || "",
      subject: b.subject || "",
      students: enrolledCount,
      marked: bMarked,
      present: bPresent,
      absent: bAbsent,
      late: bLate,
      rate: bRate,
      isMarked,
    };
  });

  const totalEnrolled = (students || []).length;
  const overallRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

  return {
    batches: batchItems,
    summary: {
      totalEnrolled,
      totalMarked,
      totalPresent,
      totalAbsent,
      totalLate,
      overallRate,
    },
  };
}

/**
 * Fetches batch attendance register for marking or editing attendance on a specific date.
 */
export async function getBatchAttendanceRegister(
  batchId: string,
  date: string
): Promise<BatchAttendanceRegisterData> {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized: Only tutors can view attendance register.");
  }
  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  // 1. Fetch batch details
  const { data: batch, error: batchErr } = await supabase
    .from("batches")
    .select("id, name, grade_class, subject, tutor_id")
    .eq("id", batchId)
    .single();

  if (batchErr || !batch || batch.tutor_id !== tutorId) {
    throw new Error("Batch not found or unauthorized.");
  }

  // 2. Fetch enrolled students
  const { data: students = [], error: stuErr } = await supabase
    .from("students")
    .select("id, full_name, phone, guardian_phone, institution, invite_code, enrolled_batch_ids, status, created_at")
    .eq("tutor_id", tutorId)
    .eq("status", "active")
    .contains("enrolled_batch_ids", [batchId])
    .order("full_name", { ascending: true });

  if (stuErr) {
    throw new Error(`Failed to fetch students: ${stuErr.message}`);
  }

  // 3. Fetch existing attendance record for this batch & date
  const { data: attendanceRow } = await supabase
    .from("attendance")
    .select("id, records, scan_method, updated_at")
    .eq("batch_id", batchId)
    .eq("date", date)
    .maybeSingle();

  const existingRecords = (attendanceRow?.records || {}) as Record<string, AttendanceRecord>;
  const isMarked = Boolean(attendanceRow && Object.keys(existingRecords).length > 0);

  const studentRegisterItems: RegisterStudentItem[] = (students || []).map((st, idx) => {
    const rec = existingRecords[st.id];
    const nameParts = (st.full_name || "Student").trim().split(" ");
    const initials =
      nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : nameParts[0].slice(0, 2).toUpperCase();

    return {
      studentId: st.id,
      rollNo: String(idx + 1).padStart(2, "0"),
      fullName: st.full_name,
      phone: st.phone,
      guardianPhone: st.guardian_phone || null,
      institution: st.institution || null,
      inviteCode: st.invite_code,
      avatarInitials: initials,
      status: (rec?.status as "present" | "absent" | "late") || null,
      remarks: rec?.remarks || "",
    };
  });

  return {
    batch: {
      id: batch.id,
      name: batch.name,
      gradeClass: batch.grade_class || "",
      subject: batch.subject || "",
    },
    students: studentRegisterItems,
    date,
    isMarked,
  };
}

/**
 * Safely fetches attendance history for the authenticated student.
 */
export async function getStudentAttendanceHistory(): Promise<AttendanceDoc[]> {
  const authState = await verifyUserAuth();
  if (authState.role !== "student") {
    throw new Error("Unauthorized: Only students can view their attendance history.");
  }

  const supabase = createAdminClient();
  let studentDocId = authState.studentDocId;
  let tutorId = authState.tutorId;

  if (!studentDocId || !tutorId) {
    const { data: student } = await supabase
      .from("students")
      .select("id, tutor_id, enrolled_batch_ids")
      .eq("auth_uid", authState.uid)
      .maybeSingle();

    if (!student) return [];
    studentDocId = student.id;
    tutorId = student.tutor_id;
  }

  const { data: studentDoc } = await supabase
    .from("students")
    .select("enrolled_batch_ids")
    .eq("id", studentDocId)
    .single();

  const enrolledBatchIds: string[] = studentDoc?.enrolled_batch_ids || [];
  if (!enrolledBatchIds || enrolledBatchIds.length === 0) return [];

  const { data: records } = await supabase
    .from("attendance")
    .select("*")
    .eq("tutor_id", tutorId)
    .in("batch_id", enrolledBatchIds);

  if (!records) return [];

  const logs: AttendanceDoc[] = [];

  if (!studentDocId) return [];

  for (const row of records) {
    const recs = row.records as Record<string, AttendanceRecord>;
    if (recs && studentDocId && recs[studentDocId]) {
      logs.push({
        id: row.id,
        tutorId: row.tutor_id,
        batchId: row.batch_id,
        date: row.date,
        timestamp: row.created_at,
        records: {
          [studentDocId]: recs[studentDocId],
        },
      });
    }
  }

  logs.sort((a, b) => (b.date > a.date ? 1 : -1));
  return logs;
}

/**
 * Tutor generates a live QR session for a batch.
 */
export async function generateQRSession(
  payload: { batchId: string; durationMinutes?: number }
) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor") {
    throw new Error("Unauthorized: Only tutors can create QR attendance sessions.");
  }
  const tutorId = authState.tutorId || authState.uid;
  const { batchId, durationMinutes = 5 } = payload;
  const date = new Date().toISOString().split("T")[0];

  const supabase = createAdminClient();

  // Fetch batch details to verify tutor ownership
  const { data: batch, error: batchErr } = await supabase
    .from("batches")
    .select("name, tutor_id")
    .eq("id", batchId)
    .single();

  if (batchErr || !batch || batch.tutor_id !== tutorId) {
    throw new Error("Batch not found or unauthorized.");
  }

  // Generate unique token & 6-digit short code
  const token = `TMQR-${crypto.randomUUID()}`;
  const shortCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

  // Deactivate any existing active tokens for this batch & date
  await supabase
    .from("qr_tokens")
    .update({ is_used: true })
    .eq("batch_id", batchId)
    .eq("date", date);

  const { data: qrToken, error } = await supabase
    .from("qr_tokens")
    .insert({
      tutor_id: tutorId,
      batch_id: batchId,
      date,
      token,
      short_code: shortCode,
      expires_at: expiresAt,
      is_used: false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to generate QR token: ${error.message}`);
  }

  return {
    success: true,
    qrToken: {
      id: qrToken.id,
      tutorId: qrToken.tutor_id,
      batchId: qrToken.batch_id,
      batchName: batch.name,
      date: qrToken.date,
      token: qrToken.token,
      shortCode: qrToken.short_code,
      expiresAt: qrToken.expires_at,
    },
  };
}

/**
 * Get active QR session for a batch (tutor view)
 */
export async function getActiveQRSession(batchId: string) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor") {
    throw new Error("Unauthorized.");
  }
  const tutorId = authState.tutorId || authState.uid;
  const date = new Date().toISOString().split("T")[0];

  const supabase = createAdminClient();

  const { data: qrToken } = await supabase
    .from("qr_tokens")
    .select("*")
    .eq("batch_id", batchId)
    .eq("tutor_id", tutorId)
    .eq("date", date)
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!qrToken) return null;

  // Also fetch current attendance for today to check scanned count
  const { data: att } = await supabase
    .from("attendance")
    .select("records")
    .eq("batch_id", batchId)
    .eq("date", date)
    .maybeSingle();

  const records = (att?.records || {}) as Record<string, AttendanceRecord>;
  const presentCount = Object.values(records).filter((r) => r?.status === "present").length;

  return {
    id: qrToken.id,
    tutorId: qrToken.tutor_id,
    batchId: qrToken.batch_id,
    date: qrToken.date,
    token: qrToken.token,
    shortCode: qrToken.short_code,
    expiresAt: qrToken.expires_at,
    presentCount,
  };
}

/**
 * Student scans QR code or enters 6-digit PIN to mark attendance.
 */
export async function scanQRAttendance(tokenOrPin: string) {
  const authState = await verifyUserAuth();
  if (authState.role !== "student") {
    throw new Error("Unauthorized: Only students can scan QR attendance.");
  }

  const supabase = createAdminClient();

  // Find student doc
  let studentDocId = authState.studentDocId;

  if (!studentDocId) {
    const { data: student } = await supabase
      .from("students")
      .select("id, enrolled_batch_ids, full_name")
      .eq("auth_uid", authState.uid)
      .maybeSingle();

    if (!student) {
      throw new Error("Student profile not found.");
    }
    studentDocId = student.id;
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, enrolled_batch_ids, full_name")
    .eq("id", studentDocId)
    .single();

  if (!student) {
    throw new Error("Student profile not found.");
  }

  const cleanedInput = tokenOrPin.trim();

  // Find matching token or short_code
  let { data: qrToken } = await supabase
    .from("qr_tokens")
    .select("*, batches(name)")
    .eq("token", cleanedInput)
    .maybeSingle();

  if (!qrToken) {
    const { data: byCode } = await supabase
      .from("qr_tokens")
      .select("*, batches(name)")
      .eq("short_code", cleanedInput)
      .maybeSingle();
    qrToken = byCode;
  }

  if (!qrToken) {
    throw new Error("Invalid QR Code or PIN. Please check and try again.");
  }

  const now = new Date().toISOString();
  if (qrToken.expires_at < now || qrToken.is_used) {
    throw new Error("This QR session has expired or is no longer active.");
  }

  // Check enrollment
  const enrolledBatches: string[] = student.enrolled_batch_ids || [];
  if (!enrolledBatches.includes(qrToken.batch_id)) {
    throw new Error("You are not enrolled in this batch.");
  }

  const batchId = qrToken.batch_id;
  const date = qrToken.date;
  const tutorId = qrToken.tutor_id;

  // Fetch all active students in batch to populate initial attendance map if missing
  const { data: allStudents } = await supabase
    .from("students")
    .select("id")
    .eq("status", "active")
    .contains("enrolled_batch_ids", [batchId]);

  // Fetch existing attendance record for this batch & date
  const { data: att } = await supabase
    .from("attendance")
    .select("id, records")
    .eq("batch_id", batchId)
    .eq("date", date)
    .maybeSingle();

  let records: Record<string, AttendanceRecord> = {};

  if (att && att.records) {
    records = att.records as Record<string, AttendanceRecord>;
  } else {
    // Initialize all students as absent except scanning student
    (allStudents || []).forEach((s) => {
      records[s.id] = { status: "absent", remarks: null };
    });
  }

  // Set scanning student to present
  records[student.id] = {
    status: "present",
    remarks: "Scanned via QR Code 📷",
  };

  const { error: upsertErr } = await supabase.from("attendance").upsert(
    {
      tutor_id: tutorId,
      batch_id: batchId,
      date: date,
      records: records,
      scan_method: "qr",
    },
    { onConflict: "batch_id, date" }
  );

  if (upsertErr) {
    throw new Error(`Failed to log attendance: ${upsertErr.message}`);
  }

  const batchName = (qrToken.batches as unknown as { name: string })?.name || "Batch";

  return {
    success: true,
    batchName,
    date,
    studentName: student.full_name,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

// ─── MONTHLY ATTENDANCE EXPORT ────────────────────────────────────────────────

export interface AttendanceExportStudent {
  id: string;
  fullName: string;
  phone: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalClasses: number;
  rate: number;
  dailyStatus: Record<string, "present" | "absent" | "late" | null>;
}

export interface AttendanceExportData {
  batch: {
    id: string;
    name: string;
    gradeClass: string;
    subject: string;
  };
  year: number;
  month: number;
  monthName: string;
  dates: string[];
  students: AttendanceExportStudent[];
}

export async function getMonthlyAttendanceExportData(
  batchId: string,
  year: number,
  month: number
): Promise<AttendanceExportData | null> {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized");
  }

  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  // 1. Fetch batch
  const { data: batch } = await supabase
    .from("batches")
    .select("id, name, grade_class, subject")
    .eq("id", batchId)
    .eq("tutor_id", tutorId)
    .single();

  if (!batch) return null;

  // 2. Fetch enrolled students
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, phone")
    .eq("tutor_id", tutorId)
    .eq("status", "active")
    .contains("enrolled_batch_ids", [batchId]);

  const studentList = students || [];

  // 3. Fetch attendance records from attendance_records table for this batch & month
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  // Fetch from normalized attendance_records table
  const { data: normRecords } = await supabase
    .from("attendance_records")
    .select("student_id, date, status")
    .eq("batch_id", batchId)
    .eq("tutor_id", tutorId)
    .gte("date", startDate)
    .lt("date", endDate)
    .order("date", { ascending: true });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Group by distinct dates
  const distinctDates = Array.from(
    new Set((normRecords || []).map((r) => r.date))
  ).sort();

  // Build matrix per student
  const studentMap: Record<string, AttendanceExportStudent> = {};
  for (const s of studentList) {
    studentMap[s.id] = {
      id: s.id,
      fullName: s.full_name,
      phone: s.phone,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      totalClasses: distinctDates.length,
      rate: 100,
      dailyStatus: {},
    };
    for (const d of distinctDates) {
      studentMap[s.id].dailyStatus[d] = null;
    }
  }

  for (const rec of normRecords || []) {
    if (studentMap[rec.student_id]) {
      const st = studentMap[rec.student_id];
      const status = rec.status as "present" | "absent" | "late";
      st.dailyStatus[rec.date] = status;
      if (status === "present") st.presentCount++;
      else if (status === "absent") st.absentCount++;
      else if (status === "late") st.lateCount++;
    }
  }

  const exportStudents = Object.values(studentMap).map((s) => {
    const attended = s.presentCount + s.lateCount;
    const rate = s.totalClasses > 0 ? Math.round((attended / s.totalClasses) * 100) : 100;
    return { ...s, rate };
  });

  return {
    batch: {
      id: batch.id,
      name: batch.name,
      gradeClass: batch.grade_class || "",
      subject: batch.subject || "",
    },
    year,
    month,
    monthName: monthNames[month - 1] || `Month ${month}`,
    dates: distinctDates,
    students: exportStudents,
  };
}


