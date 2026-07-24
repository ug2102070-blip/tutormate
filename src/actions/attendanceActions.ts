"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { z } from "zod";
import type { AttendanceDoc, AttendanceRecord } from "@/types";

const saveAttendanceSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  records: z.record(
    z.string(),
    z.object({
      status: z.enum(["present", "absent", "late"]),
      remarks: z.string().optional(),
    })
  ),
});

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

  const validated = saveAttendanceSchema.parse(payload);
  const { batchId, date, records } = validated;

  // Verify batch ownership
  const batchDoc = await adminDb.collection("batches").doc(batchId).get();
  if (!batchDoc.exists || batchDoc.data()?.tutorId !== tutorId) {
    throw new Error("Unauthorized: Batch not found or does not belong to tutor.");
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

/**
 * Safely fetches attendance history for the authenticated student.
 * Extracts ONLY the calling student's records from attendance documents.
 */
export async function getStudentAttendanceHistory(idToken: string): Promise<AttendanceDoc[]> {
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  if (decodedToken.role !== "student") {
    throw new Error("Unauthorized: Only students can view their attendance history.");
  }

  const studentAuthUid = decodedToken.uid;
  const studentDocId = decodedToken.studentDocId as string;
  const tutorId = decodedToken.tutorId as string;

  if (!studentDocId || !tutorId) {
    // Fallback: look up student document by authUid in Admin DB
    const studentSnap = await adminDb
      .collection("students")
      .where("authUid", "==", studentAuthUid)
      .limit(1)
      .get();

    if (studentSnap.empty) {
      return [];
    }

    const sDoc = studentSnap.docs[0];
    const sData = sDoc.data();
    return fetchSanitizedStudentAttendance(sDoc.id, sData.tutorId, sData.enrolledBatchIds || []);
  }

  // Fetch student doc for enrolledBatchIds
  const studentDocSnap = await adminDb.collection("students").doc(studentDocId).get();
  if (!studentDocSnap.exists) {
    return [];
  }

  const sData = studentDocSnap.data()!;
  return fetchSanitizedStudentAttendance(studentDocId, tutorId, sData.enrolledBatchIds || []);
}

async function fetchSanitizedStudentAttendance(
  studentDocId: string,
  tutorId: string,
  enrolledBatchIds: string[]
): Promise<AttendanceDoc[]> {
  if (!enrolledBatchIds || enrolledBatchIds.length === 0) {
    return [];
  }

  const attSnap = await adminDb
    .collection("attendance")
    .where("tutorId", "==", tutorId)
    .get();

  const logs: AttendanceDoc[] = [];

  attSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (
      enrolledBatchIds.includes(data.batchId) &&
      data.records?.[studentDocId]
    ) {
      // Expose only the target student's record for data isolation
      logs.push({
        id: docSnap.id,
        tutorId: data.tutorId,
        batchId: data.batchId,
        date: data.date,
        records: {
          [studentDocId]: data.records[studentDocId],
        },
      } as AttendanceDoc);
    }
  });

  logs.sort((a, b) => (b.date > a.date ? 1 : -1));
  return logs;
}

