"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import { getTutorId } from "@/lib/enrollment";
import { z } from "zod";

const autoGenerateSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

export interface AutoGenerateFeesResult {
  success: boolean;
  count: number;
  batchesCount: number;
  message: string;
}

/**
 * Generates monthly fees for ALL active batches of the authenticated tutor in a single click.
 * Uses O(1) bulk fetch and bulk insert to eliminate N+1 latency.
 */
export async function generateMonthlyFeesForAllBatches(
  params?: { year?: number; month?: number }
): Promise<AutoGenerateFeesResult> {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized: Only tutors can generate fee records.");
  }

  const tutorId = getTutorId(authState);
  const now = new Date();
  const year = params?.year || now.getFullYear();
  const month = params?.month || now.getMonth() + 1;

  autoGenerateSchema.parse({ year, month });

  const supabase = createAdminClient();

  // 1. Fetch all active non-archived batches of this tutor with monthly_fee > 0
  const { data: batches, error: batchErr } = await supabase
    .from("batches")
    .select("id, name, monthly_fee")
    .eq("tutor_id", tutorId)
    .eq("is_archived", false)
    .gt("monthly_fee", 0);

  if (batchErr || !batches || batches.length === 0) {
    return {
      success: true,
      count: 0,
      batchesCount: 0,
      message: "No active batches with tuition fees found.",
    };
  }

  const batchMap = new Map(batches.map((b) => [b.id, Number(b.monthly_fee) || 0]));
  const batchIds = batches.map((b) => b.id);

  // 2. Fetch all active students of this tutor
  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("id, enrolled_batch_ids")
    .eq("tutor_id", tutorId)
    .eq("status", "active");

  if (studentErr || !students || students.length === 0) {
    return {
      success: true,
      count: 0,
      batchesCount: batches.length,
      message: "No active students found in your batches.",
    };
  }

  // 3. Single Query: Fetch all existing fees for this tutor, year, and month
  const { data: existingFees } = await supabase
    .from("fees")
    .select("student_id, batch_id")
    .eq("tutor_id", tutorId)
    .eq("year", year)
    .eq("month", month);

  const existingSet = new Set(
    (existingFees || []).map((f) => `${f.student_id}:${f.batch_id}`)
  );

  // 4. Build bulk insert list
  const recordsToInsert: Array<{
    tutor_id: string;
    student_id: string;
    batch_id: string;
    year: number;
    month: number;
    amount_due: number;
    amount_paid: number;
    status: "unpaid";
  }> = [];

  for (const student of students) {
    const enrolledBatchIds: string[] = student.enrolled_batch_ids || [];

    for (const batchId of enrolledBatchIds) {
      if (!batchMap.has(batchId)) continue;

      const key = `${student.id}:${batchId}`;
      if (!existingSet.has(key)) {
        const feeAmount = batchMap.get(batchId) || 0;
        recordsToInsert.push({
          tutor_id: tutorId,
          student_id: student.id,
          batch_id: batchId,
          year,
          month,
          amount_due: feeAmount,
          amount_paid: 0,
          status: "unpaid",
        });
        existingSet.add(key);
      }
    }
  }

  if (recordsToInsert.length === 0) {
    return {
      success: true,
      count: 0,
      batchesCount: batches.length,
      message: "All fee invoices for this month have already been generated.",
    };
  }

  // 5. Bulk insert
  const { data: inserted, error: insertErr } = await supabase
    .from("fees")
    .insert(recordsToInsert)
    .select("id");

  if (insertErr) {
    // Graceful duplicate handler
    if (insertErr.code === "23505" || insertErr.message?.includes("duplicate")) {
      return {
        success: true,
        count: 0,
        batchesCount: batches.length,
        message: "Fee records for this month are already up to date.",
      };
    }
    throw new Error(`Failed to generate fees: ${insertErr.message}`);
  }

  const generatedCount = inserted?.length ?? recordsToInsert.length;

  return {
    success: true,
    count: generatedCount,
    batchesCount: batches.length,
    message: `Generated ${generatedCount} fee invoice${generatedCount !== 1 ? "s" : ""} across ${batches.length} batch${batches.length !== 1 ? "es" : ""}.`,
  };
}
