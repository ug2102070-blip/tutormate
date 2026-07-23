"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { studentSchema, type StudentFormValues } from "@/lib/validations/student";
import { generateInviteCode } from "@/lib/utils";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Creates a student record under the authenticated tutor and generates a unique invite code.
 */
export async function createStudent(formData: StudentFormValues, idToken: string) {
  // 1. Verify caller identity & role
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  if (decodedToken.role !== "tutor") {
    throw new Error("Unauthorized: Only tutors can add students.");
  }
  const tutorId = decodedToken.uid;

  // 2. Validate input
  const validated = studentSchema.parse(formData);

  // 3. Generate unique invite code
  const inviteCode = generateInviteCode(8);

  // 4. Create student doc in Firestore
  const studentRef = adminDb.collection("students").doc();
  const studentData = {
    id: studentRef.id,
    tutorId,
    authUid: null, // Unlinked until student registers with invite code
    inviteCode,
    fullName: validated.fullName,
    phone: validated.phone,
    guardianPhone: validated.guardianPhone || null,
    institution: validated.institution || null,
    enrolledBatchIds: validated.enrolledBatchIds,
    status: "active",
    createdAt: new Date(),
  };

  await studentRef.set(studentData);

  // 5. Update studentCount for enrolled batches
  for (const batchId of validated.enrolledBatchIds) {
    await adminDb.collection("batches").doc(batchId).set(
      {
        studentCount: FieldValue.increment(1),
      },
      { merge: true }
    );
  }

  // 6. Update tutor stats (totalStudents)
  await adminDb.collection("tutors").doc(tutorId).set(
    {
      stats: {
        totalStudents: FieldValue.increment(1),
      },
    },
    { merge: true }
  );

  return { success: true, studentId: studentRef.id, inviteCode };
}
