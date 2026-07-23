"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { inviteRateLimiter } from "@/lib/ratelimit";
import { headers } from "next/headers";

/**
 * Claims a student invite code, linking the student's Firebase Auth account
 * to their tutor-created profile in Firestore.
 */
export async function claimStudentInvite(
  inviteCode: string,
  studentUid: string
) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
  const { success: rateLimitOk } = await inviteRateLimiter.limit(ip);

  if (!rateLimitOk) {
    throw new Error(
      "Too many attempts. Please wait 1 minute before trying again."
    );
  }

  const snapshot = await adminDb
    .collection("students")
    .where("inviteCode", "==", inviteCode.toUpperCase().trim())
    .where("authUid", "==", null)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error("Invalid or already claimed invite code.");
  }

  const studentDoc = snapshot.docs[0];
  const studentData = studentDoc.data();

  await studentDoc.ref.update({
    authUid: studentUid,
    updatedAt: new Date(),
  });

  const claims = {
    role: "student" as const,
    tutorId: studentData.tutorId,
    studentDocId: studentDoc.id,
  };
  await adminAuth.setCustomUserClaims(studentUid, claims);

  await adminDb.collection("users").doc(studentUid).set(
    {
      uid: studentUid,
      role: "student",
      tutorId: studentData.tutorId,
      studentDocId: studentDoc.id,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  return { success: true, tutorId: studentData.tutorId };
}
