"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { doubtSchema, messageSchema, type DoubtFormValues, type MessageFormValues } from "@/lib/validations/doubt";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Creates a new doubt conversation under `/doubts/{doubtId}`.
 * Verifies that caller is a student and that studentDocId / tutorId match their JWT custom claims.
 */
export async function createDoubt(formData: DoubtFormValues, studentName: string, idToken: string) {
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  if (decodedToken.role !== "student") {
    throw new Error("Unauthorized: Only students can ask doubts.");
  }

  const studentAuthUid = decodedToken.uid;
  const tutorId = (decodedToken.tutorId as string) || "";
  const studentDocId = (decodedToken.studentDocId as string) || "";

  if (!tutorId || !studentDocId) {
    throw new Error("Invalid student claims: missing tutorId or studentDocId");
  }

  const validated = doubtSchema.parse(formData);

  const doubtRef = adminDb.collection("doubts").doc();
  const doubtData = {
    id: doubtRef.id,
    tutorId,
    studentDocId,
    studentAuthUid,
    studentName,
    batchId: validated.batchId,
    title: validated.title,
    initialQuestion: validated.initialQuestion,
    attachmentPath: validated.attachmentPath || null,
    status: "pending",
    lastMessageAt: new Date(),
    unreadByTutor: true,
    unreadByStudent: false,
    createdAt: new Date(),
  };

  await doubtRef.set(doubtData);

  // Increment tutor pendingDoubtsCount stats
  await adminDb.collection("tutors").doc(tutorId).set(
    {
      stats: {
        pendingDoubtsCount: FieldValue.increment(1),
      },
    },
    { merge: true }
  );

  return { success: true, doubtId: doubtRef.id };
}

/**
 * Posts a message reply into `/doubts/{doubtId}/messages/{messageId}`.
 */
export async function postMessage(
  doubtId: string,
  formData: MessageFormValues,
  idToken: string
) {
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  const callerUid = decodedToken.uid;
  const callerRole = (decodedToken.role as string) || "";
  const callerTutorId = (decodedToken.tutorId as string) || "";

  const doubtRef = adminDb.collection("doubts").doc(doubtId);
  const doubtSnap = await doubtRef.get();
  if (!doubtSnap.exists) {
    throw new Error("Doubt thread not found");
  }

  const doubtData = doubtSnap.data()!;
  const isTutor = callerRole === "tutor" && callerTutorId === doubtData.tutorId;
  const isStudent = callerRole === "student" && callerUid === doubtData.studentAuthUid;

  if (!isTutor && !isStudent) {
    throw new Error("Unauthorized to access this doubt thread");
  }

  const validated = messageSchema.parse(formData);

  const messageRef = doubtRef.collection("messages").doc();
  await messageRef.set({
    id: messageRef.id,
    senderUid: callerUid,
    senderRole: isTutor ? "tutor" : "student",
    text: validated.text,
    attachmentPath: validated.attachmentPath || null,
    attachmentType: validated.attachmentPath ? "image" : null,
    createdAt: new Date(),
  });

  // Update parent doubt metadata
  const updates: Record<string, unknown> = {
    lastMessageAt: new Date(),
  };

  if (isTutor) {
    updates.unreadByStudent = true;
    updates.unreadByTutor = false;
    // Auto-update status to answered if currently pending
    if (doubtData.status === "pending") {
      updates.status = "answered";
      // Decrement tutor pending count
      await adminDb.collection("tutors").doc(doubtData.tutorId).set(
        {
          stats: {
            pendingDoubtsCount: FieldValue.increment(-1),
          },
        },
        { merge: true }
      );
    }
  } else {
    updates.unreadByTutor = true;
    updates.unreadByStudent = false;
  }

  await doubtRef.update(updates);

  return { success: true, messageId: messageRef.id };
}

/**
 * Updates status of a doubt (e.g. mark resolved).
 * Student status transition guard: student can ONLY transition from 'answered' -> 'resolved'.
 */
export async function updateDoubtStatus(
  doubtId: string,
  newStatus: "pending" | "answered" | "resolved",
  idToken: string
) {
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  const callerUid = decodedToken.uid;
  const callerRole = (decodedToken.role as string) || "";
  const callerTutorId = (decodedToken.tutorId as string) || "";

  const doubtRef = adminDb.collection("doubts").doc(doubtId);
  const doubtSnap = await doubtRef.get();
  if (!doubtSnap.exists) {
    throw new Error("Doubt not found");
  }

  const doubtData = doubtSnap.data()!;
  const currentStatus = doubtData.status;

  const isTutor = callerRole === "tutor" && callerTutorId === doubtData.tutorId;
  const isStudent = callerRole === "student" && callerUid === doubtData.studentAuthUid;

  if (isStudent) {
    // ENUM STATUS TRANSITION GUARD FOR STUDENT
    if (currentStatus !== "answered" || newStatus !== "resolved") {
      throw new Error("Students can only mark answered doubts as resolved.");
    }
  } else if (!isTutor && callerRole !== "admin") {
    throw new Error("Unauthorized");
  }

  await doubtRef.update({
    status: newStatus,
    updatedAt: new Date(),
  });

  return { success: true };
}
