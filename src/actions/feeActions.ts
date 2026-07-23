"use server";

import { adminDb, adminAuth } from "@/lib/firebase/admin";

interface GenerateMonthlyFeesPayload {
  batchId: string;
  year: number;
  month: number;
}

/**
 * Generates fee records for all active students enrolled in a batch for a specified year/month.
 */
export async function generateMonthlyFees(
  payload: GenerateMonthlyFeesPayload,
  idToken: string
) {
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  if (decodedToken.role !== "tutor") {
    throw new Error("Unauthorized");
  }
  const tutorId = decodedToken.uid;

  const { batchId, year, month } = payload;

  // 1. Fetch batch details for monthly fee amount
  const batchDoc = await adminDb.collection("batches").doc(batchId).get();
  if (!batchDoc.exists || batchDoc.data()?.tutorId !== tutorId) {
    throw new Error("Batch not found");
  }
  const batchFee = batchDoc.data()?.monthlyFee || 0;

  // 2. Fetch all enrolled active students in this batch
  const studentsSnap = await adminDb
    .collection("students")
    .where("tutorId", "==", tutorId)
    .where("status", "==", "active")
    .where("enrolledBatchIds", "array-contains", batchId)
    .get();

  if (studentsSnap.empty) {
    return { success: true, count: 0, message: "No students enrolled in this batch." };
  }

  let createdCount = 0;
  const batch = adminDb.batch();

  // 3. Create fee record if it doesn't already exist
  for (const doc of studentsSnap.docs) {
    const studentId = doc.id;
    const feeId = `${studentId}_${year}_${month}`;
    const feeRef = adminDb.collection("fees").doc(feeId);

    const feeSnap = await feeRef.get();
    if (!feeSnap.exists) {
      batch.set(feeRef, {
        id: feeId,
        tutorId,
        studentId,
        batchId,
        year,
        month,
        amountDue: batchFee,
        amountPaid: 0,
        status: "unpaid",
        paymentMethod: null,
        paidAt: null,
        updatedAt: new Date(),
      });
      createdCount++;
    }
  }

  if (createdCount > 0) {
    await batch.commit();
  }

  return { success: true, count: createdCount };
}

interface UpdateFeeStatusPayload {
  feeId: string;
  status: "paid" | "unpaid" | "partial";
  amountPaid: number;
  paymentMethod: "cash" | "bkash" | "nagad" | "other" | null;
}

/**
 * Updates fee payment status and payment method for a student fee record.
 */
export async function updateFeeStatus(
  payload: UpdateFeeStatusPayload,
  idToken: string
) {
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  if (decodedToken.role !== "tutor") {
    throw new Error("Unauthorized");
  }
  const tutorId = decodedToken.uid;

  const { feeId, status, amountPaid, paymentMethod } = payload;
  const feeRef = adminDb.collection("fees").doc(feeId);
  const feeSnap = await feeRef.get();

  if (!feeSnap.exists || feeSnap.data()?.tutorId !== tutorId) {
    throw new Error("Fee record not found");
  }

  await feeRef.update({
    status,
    amountPaid,
    paymentMethod: status === "paid" || status === "partial" ? paymentMethod : null,
    paidAt: status === "paid" ? new Date() : null,
    updatedAt: new Date(),
  });

  return { success: true };
}
