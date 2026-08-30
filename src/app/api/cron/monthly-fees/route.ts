import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  return handleCronJob(request);
}

export async function POST(request: NextRequest) {
  return handleCronJob(request);
}

async function handleCronJob(request: NextRequest) {
  try {
    // 1. Verify Secret Key for Cron Security
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const customHeader = request.headers.get("x-cron-secret");

    const providedKey = authHeader?.replace("Bearer ", "") || customHeader;

    if (cronSecret && providedKey !== cronSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized cron request." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // 2. Fetch all active non-archived batches with monthly_fee > 0
    const { data: batches, error: batchErr } = await supabase
      .from("batches")
      .select("id, tutor_id, name, monthly_fee")
      .eq("is_archived", false)
      .gt("monthly_fee", 0);

    if (batchErr || !batches || batches.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active batches found for fee generation.",
        feesGenerated: 0,
      });
    }

    // 3. Fetch all active students with their enrollments
    const { data: students, error: studentErr } = await supabase
      .from("students")
      .select("id, tutor_id, full_name, enrolled_batch_ids")
      .eq("status", "active");

    if (studentErr || !students || students.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active students found.",
        feesGenerated: 0,
      });
    }

    const batchMap = new Map(batches.map((b) => [b.id, b]));

    // 4. Bulk Query: Fetch all existing fees for this year & month in a single O(1) query
    const { data: existingFees } = await supabase
      .from("fees")
      .select("student_id, batch_id")
      .eq("year", currentYear)
      .eq("month", currentMonth);

    const existingFeeSet = new Set(
      (existingFees || []).map((f) => `${f.student_id}:${f.batch_id}`)
    );

    // 5. Build bulk records payload
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
        const batch = batchMap.get(batchId);
        if (!batch) continue;

        const key = `${student.id}:${batch.id}`;
        if (!existingFeeSet.has(key)) {
          recordsToInsert.push({
            tutor_id: batch.tutor_id,
            student_id: student.id,
            batch_id: batch.id,
            year: currentYear,
            month: currentMonth,
            amount_due: Number(batch.monthly_fee) || 0,
            amount_paid: 0,
            status: "unpaid",
          });
          // Prevent duplicates if students have duplicate batch IDs in their array
          existingFeeSet.add(key);
        }
      }
    }

    // 6. Bulk Insert in chunks of 500
    let insertedCount = 0;
    const CHUNK_SIZE = 500;
    for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
      const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
      const { data: inserted, error: insertErr } = await supabase
        .from("fees")
        .insert(chunk)
        .select("id");

      if (!insertErr) {
        insertedCount += inserted?.length ?? chunk.length;
      } else {
        console.error("[CRON BULK INSERT ERROR]", insertErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Monthly fee generation complete for ${currentYear}-${currentMonth}`,
      feesGenerated: insertedCount,
      totalPendingRecords: recordsToInsert.length,
      year: currentYear,
      month: currentMonth,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Cron Error";
    console.error("[CRON MONTHLY FEES ERROR]", err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
