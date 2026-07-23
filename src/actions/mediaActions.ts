"use server";

import { adminStorage, adminAuth } from "@/lib/firebase/admin";

/**
 * Generates a short-lived signed URL for a Storage object.
 */
export async function getMediaSignedUrl(
  storagePath: string,
  idToken: string
): Promise<string | null> {
  if (!storagePath || !idToken) return null;

  let decodedToken: {
    uid: string;
    role?: string;
    tutorId?: string;
    [key: string]: unknown;
  };
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch {
    throw new Error("Invalid or expired authentication token");
  }

  const callerUid = decodedToken.uid;
  const callerRole = (decodedToken.role as string) ?? "";
  const callerTutorId = (decodedToken.tutorId as string) ?? "";

  const parts = storagePath.split("/");
  if (parts.length < 5 || parts[0] !== "doubts") {
    throw new Error("Invalid storage path format");
  }

  const pathTutorId = parts[1];
  const pathStudentAuthUid = parts[2];

  const isTutor = callerRole === "tutor" && callerTutorId === pathTutorId;
  const isStudent = callerRole === "student" && callerUid === pathStudentAuthUid;
  const isAdmin = callerRole === "admin";

  if (!isTutor && !isStudent && !isAdmin) {
    throw new Error("Unauthorized: you do not have access to this file");
  }

  const bucket = adminStorage.bucket();
  const file = bucket.file(storagePath);

  const [signedUrl] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
  });

  return signedUrl;
}
