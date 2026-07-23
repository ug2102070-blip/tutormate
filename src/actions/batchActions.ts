"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { batchSchema, type BatchFormValues } from "@/lib/validations/batch";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Creates a new batch under the authenticated tutor.
 */
export async function createBatch(formData: BatchFormValues, idToken: string) {
  // 1. Verify caller identity & role
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  if (decodedToken.role !== "tutor") {
    throw new Error("Unauthorized: Only tutors can create batches.");
  }
  const tutorId = decodedToken.uid;

  // 2. Validate input
  const validated = batchSchema.parse(formData);

  // 3. Create batch doc in Firestore
  const batchRef = adminDb.collection("batches").doc();
  const batchData = {
    id: batchRef.id,
    tutorId,
    name: validated.name,
    subject: validated.subject,
    gradeClass: validated.gradeClass,
    monthlyFee: validated.monthlyFee,
    schedule: validated.schedule,
    studentCount: 0,
    isArchived: false,
    createdAt: new Date(),
  };

  await batchRef.set(batchData);

  // 4. Update tutor stats (activeBatches)
  await adminDb.collection("tutors").doc(tutorId).set(
    {
      stats: {
        activeBatches: FieldValue.increment(1),
      },
    },
    { merge: true }
  );

  return { success: true, batchId: batchRef.id };
}

/**
 * Updates an existing batch.
 */
export async function updateBatch(
  batchId: string,
  formData: BatchFormValues,
  idToken: string
) {
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  if (decodedToken.role !== "tutor") {
    throw new Error("Unauthorized");
  }
  const tutorId = decodedToken.uid;

  // Check batch ownership
  const batchDoc = await adminDb.collection("batches").doc(batchId).get();
  if (!batchDoc.exists || batchDoc.data()?.tutorId !== tutorId) {
    throw new Error("Batch not found or unauthorized");
  }

  const validated = batchSchema.parse(formData);

  await batchDoc.ref.update({
    name: validated.name,
    subject: validated.subject,
    gradeClass: validated.gradeClass,
    monthlyFee: validated.monthlyFee,
    schedule: validated.schedule,
    updatedAt: new Date(),
  });

  return { success: true };
}

/**
 * Toggles batch archive status.
 */
export async function toggleArchiveBatch(batchId: string, idToken: string) {
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  if (decodedToken.role !== "tutor") {
    throw new Error("Unauthorized");
  }
  const tutorId = decodedToken.uid;

  const batchDoc = await adminDb.collection("batches").doc(batchId).get();
  if (!batchDoc.exists || batchDoc.data()?.tutorId !== tutorId) {
    throw new Error("Batch not found or unauthorized");
  }

  const currentArchived = batchDoc.data()?.isArchived || false;
  const nextArchived = !currentArchived;

  await batchDoc.ref.update({
    isArchived: nextArchived,
    updatedAt: new Date(),
  });

  // Update stats increment
  await adminDb.collection("tutors").doc(tutorId).set(
    {
      stats: {
        activeBatches: FieldValue.increment(nextArchived ? -1 : 1),
      },
    },
    { merge: true }
  );

  return { success: true, isArchived: nextArchived };
}
