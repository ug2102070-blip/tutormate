"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

/**
 * Sets custom claims for a newly registered tutor.
 * Called after Firebase Auth account creation + Firestore /users doc creation.
 */
export async function setTutorClaims(uid: string) {
  const userRecord = await adminAuth.getUser(uid);
  if (!userRecord) {
    throw new Error("User not found");
  }

  const existingClaims = userRecord.customClaims;
  if (existingClaims?.role === "tutor") {
    return { success: true, message: "Claims already set" };
  }

  const claims = {
    role: "tutor" as const,
    tutorId: uid,
  };
  await adminAuth.setCustomUserClaims(uid, claims);

  await adminDb.collection("users").doc(uid).set(
    {
      uid,
      role: "tutor",
      tutorId: uid,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  return { success: true };
}
