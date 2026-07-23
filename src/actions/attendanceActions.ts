"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import type { AttendanceRecord } from "@/types";

interface SaveAttendancePayload {
  batchId: string;
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceRecord>;
}

/**
 * Saves or updates attendance record for a batch on a given date.
 * Document ID format: {batchId}_{date}
 */
export async function saveAttendance(
  payload: SaveAttendancePayload,
  idToken: string
) {
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  if (decodedToken.role !== "tutor") {
    throw new Error("Unauthorized: Only tutors can log attendance.");
  }
  const tutorId = decodedToken.uid;

  const { batchId, date, records } = payload;
  if (!batchId || !date) {
    throw new Error("Batch ID and Date are required.");
  }

  const docId = `${batchId}_${date}`;
  const attendanceRef = adminDb.collection("attendance").doc(docId);

  await attendanceRef.set(
    {
      id: docId,
      tutorId,
      batchId,
      date,
      timestamp: new Date(),
      records,
    },
    { merge: true }
  );

  return { success: true, attendanceId: docId };
}
