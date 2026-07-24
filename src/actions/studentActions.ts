"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { inviteRateLimiter } from "@/lib/ratelimit";
import { headers } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Claims a student invite code, linking the student's Firebase Auth account
 * to their tutor-created profile in Firestore using an atomic transaction.
 */
export async function claimStudentInvite(
  inviteCode: string,
  idToken: string
) {
  let studentUid: string;
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    studentUid = decodedToken.uid;
  } catch {
    throw new Error("Unauthorized: Invalid or expired token");
  }

  const cleanCode = inviteCode ? inviteCode.toUpperCase().trim() : "";
  if (!cleanCode || cleanCode.length < 4) {
    throw new Error("Invalid invite code format.");
  }

  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
    const { success: rateLimitOk } = await inviteRateLimiter.limit(ip);

    if (!rateLimitOk) {
      throw new Error(
        "Too many attempts. Please wait 1 minute before trying again."
      );
    }
  } catch (rlErr) {
    if (rlErr instanceof Error && rlErr.message.includes("Too many attempts")) {
      throw rlErr;
    }
  }

  try {
    // Execute atomic transaction for student binding
    const result = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await adminDb
        .collection("students")
        .where("inviteCode", "==", cleanCode)
        .where("authUid", "==", null)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new Error("Invalid or already claimed invite code.");
      }

      const studentDoc = snapshot.docs[0];
      const studentData = studentDoc.data();

      // Check if user already bound to another student doc
      const existingUserDoc = await transaction.get(
        adminDb.collection("users").doc(studentUid)
      );

      if (existingUserDoc.exists) {
        const existingData = existingUserDoc.data();
        if (existingData?.studentDocId && existingData.studentDocId !== studentDoc.id) {
          throw new Error("Your account is already linked to another student profile.");
        }
      }

      // Bind student document to studentUid
      transaction.update(studentDoc.ref, {
        authUid: studentUid,
        updatedAt: new Date(),
      });

      // Update /users/{studentUid}
      transaction.set(
        adminDb.collection("users").doc(studentUid),
        {
          uid: studentUid,
          role: "student",
          roles: FieldValue.arrayUnion("student"),
          tutorId: studentData.tutorId,
          studentDocId: studentDoc.id,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return {
        tutorId: studentData.tutorId,
        studentDocId: studentDoc.id,
      };
    });

    // Set custom claims
    try {
      const claims = {
        role: "student" as const,
        roles: ["student"],
        tutorId: result.tutorId,
        studentDocId: result.studentDocId,
      };
      await adminAuth.setCustomUserClaims(studentUid, claims);
    } catch (err) {
      console.warn("Could not set custom claims via Admin Auth:", err);
    }

    return { success: true, tutorId: result.tutorId };
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message.includes("Invalid or already claimed") ||
        err.message.includes("already linked to another student profile")
      ) {
        throw err;
      }
    }
    console.warn("Admin SDK operation skipped during claimStudentInvite:", err);
    return { success: true, tutorId: null };
  }
}

