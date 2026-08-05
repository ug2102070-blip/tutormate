"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import { z } from "zod";

// ─── Validation Schemas ────────────────────────────────────────────────────────

const generateMonthlyFeesSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

const updateFeeStatusSchema = z.object({
  feeId: z.string().min(1, "Fee ID is required"),
  status: z.enum(["paid", "unpaid", "partial"]),
  amountPaid: z.number().min(0, "Amount paid cannot be negative"),
  paymentMethod: z.enum(["cash", "bkash", "nagad", "other"]).nullable().optional(),
});

interface GenerateMonthlyFeesPayload {
  batchId: string;
  year: number;
  month: number;
}

// ─── GENERATE MONTHLY FEES ────────────────────────────────────────────────────

/**
 * Generates fee records for all active students enrolled in a batch
 * for a specified year/month. Uses cookie-based auth.
 */
export async function generateMonthlyFees(payload: GenerateMonthlyFeesPayload) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized: Only tutors can generate fee records.");
  }

  const tutorId = authState.tutorId || authState.uid;
  const validated = generateMonthlyFeesSchema.parse(payload);
  const { batchId, year, month } = validated;

  const supabase = createAdminClient();

  // 1. Verify batch belongs to this tutor
  const { data: batchDoc } = await supabase
    .from("batches")
    .select("monthly_fee")
    .eq("id", batchId)
    .eq("tutor_id", tutorId)
    .single();

  if (!batchDoc) {
    throw new Error("Batch not found or you do not have permission to access it.");
  }

  const batchFee = Number(batchDoc.monthly_fee) || 0;

  // 2. Fetch enrolled active students
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("tutor_id", tutorId)
    .eq("status", "active")
    .contains("enrolled_batch_ids", [batchId]);

  if (!students || students.length === 0) {
    return { success: true, count: 0, message: "No active students enrolled in this batch." };
  }

  // 3. Insert fee records, skipping duplicates (upsert by unique constraint)
  let createdCount = 0;

  for (const student of students) {
    const { error } = await supabase.from("fees").insert({
      tutor_id: tutorId,
      student_id: student.id,
      batch_id: batchId,
      year,
      month,
      amount_due: batchFee,
      amount_paid: 0,
      status: "unpaid",
    });

    // Skip duplicate entries (already generated for this student/batch/month)
    if (!error) {
      createdCount++;
    }
  }

  return { success: true, count: createdCount };
}

// ─── UPDATE FEE STATUS ────────────────────────────────────────────────────────

interface UpdateFeeStatusPayload {
  feeId: string;
  status: "paid" | "unpaid" | "partial";
  amountPaid: number;
  paymentMethod: "cash" | "bkash" | "nagad" | "other" | null;
}

/**
 * Updates fee payment status and payment method for a student fee record.
 * Uses cookie-based auth.
 */
export async function updateFeeStatus(payload: UpdateFeeStatusPayload) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized: Only tutors can update fee status.");
  }

  const tutorId = authState.tutorId || authState.uid;
  const validated = updateFeeStatusSchema.parse(payload);
  const { feeId, status, amountPaid, paymentMethod } = validated;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("fees")
    .update({
      status,
      amount_paid: amountPaid,
      payment_method:
        status === "paid" || status === "partial" ? paymentMethod || "cash" : null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feeId)
    .eq("tutor_id", tutorId);

  if (error) {
    throw new Error(`Failed to update fee: ${error.message}`);
  }

  return { success: true };
}
