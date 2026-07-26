"use server";

import { createAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { z } from "zod";

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

/**
 * Generates fee records for all active students enrolled in a batch for a specified year/month.
 */
export async function generateMonthlyFees(
  payload: GenerateMonthlyFeesPayload,
  idToken: string
) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") {
    throw new Error("Unauthorized");
  }
  const tutorId = authState.tutorId || authState.uid;
  const validated = generateMonthlyFeesSchema.parse(payload);
  const { batchId, year, month } = validated;

  let supabase = await getSupabaseServerClient();

  // 1. Fetch batch details
  let { data: batchDoc } = await supabase
    .from("batches")
    .select("monthly_fee")
    .eq("id", batchId)
    .eq("tutor_id", tutorId)
    .single();

  if (!batchDoc) {
    const adminSupabase = createAdminClient();
    const adminRes = await adminSupabase
      .from("batches")
      .select("monthly_fee")
      .eq("id", batchId)
      .eq("tutor_id", tutorId)
      .single();
    batchDoc = adminRes.data;
  }

  if (!batchDoc) {
    throw new Error("Batch not found");
  }

  const batchFee = Number(batchDoc.monthly_fee) || 0;

  // 2. Fetch enrolled active students
  let { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("tutor_id", tutorId)
    .eq("status", "active")
    .contains("enrolled_batch_ids", [batchId]);

  if (!students) {
    const adminSupabase = createAdminClient();
    const adminRes = await adminSupabase
      .from("students")
      .select("id")
      .eq("tutor_id", tutorId)
      .eq("status", "active")
      .contains("enrolled_batch_ids", [batchId]);
    students = adminRes.data;
  }

  if (!students || students.length === 0) {
    return { success: true, count: 0, message: "No students enrolled in this batch." };
  }

  let createdCount = 0;

  for (const student of students) {
    let { error } = await supabase
      .from("fees")
      .insert({
        tutor_id: tutorId,
        student_id: student.id,
        batch_id: batchId,
        year,
        month,
        amount_due: batchFee,
        amount_paid: 0,
        status: "unpaid",
      });

    if (error) {
      const adminSupabase = createAdminClient();
      const adminRes = await adminSupabase
        .from("fees")
        .insert({
          tutor_id: tutorId,
          student_id: student.id,
          batch_id: batchId,
          year,
          month,
          amount_due: batchFee,
          amount_paid: 0,
          status: "unpaid",
        });
      error = adminRes.error;
    }

    if (!error) {
      createdCount++;
    }
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
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") {
    throw new Error("Unauthorized");
  }
  const tutorId = authState.tutorId || authState.uid;
  const validated = updateFeeStatusSchema.parse(payload);
  const { feeId, status, amountPaid, paymentMethod } = validated;

  let supabase = await getSupabaseServerClient();

  let { error } = await supabase
    .from("fees")
    .update({
      status,
      amount_paid: amountPaid,
      payment_method: status === "paid" || status === "partial" ? (paymentMethod || "cash") : null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feeId)
    .eq("tutor_id", tutorId);

  if (error) {
    const adminSupabase = createAdminClient();
    const adminRes = await adminSupabase
      .from("fees")
      .update({
        status,
        amount_paid: amountPaid,
        payment_method: status === "paid" || status === "partial" ? (paymentMethod || "cash") : null,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", feeId)
      .eq("tutor_id", tutorId);
    error = adminRes.error;
  }

  if (error) {
    throw new Error(`Failed to update fee: ${error.message}`);
  }

  return { success: true };
}
