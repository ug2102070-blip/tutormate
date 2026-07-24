"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Updates user presence status in Firestore using Admin SDK.
 * Bypasses client security rules restrictions so it never throws permission errors.
 */
export async function updateUserPresence(idToken: string, isOnline: boolean) {
  if (!idToken) return { success: false };

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (!uid) return { success: false };

    await adminDb.collection("presence").doc(uid).set(
      {
        uid,
        isOnline,
        lastSeen: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true };
  } catch (err) {
    // Fail silently without crashing
    return { success: false };
  }
}
