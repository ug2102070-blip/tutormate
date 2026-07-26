"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
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
  payload: SaveAttendancePayload,
  idToken: string
) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") {
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
export async function getStudentAttendanceHistory(idToken: string): Promise<AttendanceDoc[]> {
  const authState = await verifyUserAuth(idToken);
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
