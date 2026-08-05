"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import { z } from "zod";
import type { AttendanceDoc, AttendanceRecord } from "@/types";

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

interface SaveAttendancePayload {
  batchId: string;
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceRecord>;
}

/**
 * Saves or updates attendance record for a batch on a given date in Supabase.
 */
export async function saveAttendance(
  payload: SaveAttendancePayload
) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized: Only tutors can log attendance.");
  }
  const tutorId = authState.tutorId || authState.uid;
  const validated = saveAttendanceSchema.parse(payload);
  const { batchId, date, records } = validated;

  const supabase = createAdminClient();

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

  return { success: true, attendanceId: attendance.id };
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

