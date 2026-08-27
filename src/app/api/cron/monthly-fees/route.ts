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

    // 3. Fetch all active students
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

    let generatedCount = 0;
    const batchMap = new Map(batches.map((b) => [b.id, b]));

    // 4. Loop over students and generate pending fees for enrolled batches
    for (const student of students) {
      const enrolledBatchIds: string[] = student.enrolled_batch_ids || [];

      for (const batchId of enrolledBatchIds) {
        const batch = batchMap.get(batchId);
        if (!batch) continue;

        // Check if fee record already exists for this (student_id, batch_id, year, month)
        const { data: existingFee } = await supabase
          .from("fees")
          .select("id")
          .eq("student_id", student.id)
          .eq("batch_id", batch.id)
          .eq("year", currentYear)
          .eq("month", currentMonth)
          .maybeSingle();

        if (!existingFee) {
          const { error: insertErr } = await supabase.from("fees").insert({
            tutor_id: batch.tutor_id,
            student_id: student.id,
            batch_id: batch.id,
            year: currentYear,
            month: currentMonth,
            amount_due: batch.monthly_fee,
            amount_paid: 0,
            status: "unpaid",
          });

          if (!insertErr) {
            generatedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Monthly fee generation complete for ${currentYear}-${currentMonth}`,
      feesGenerated: generatedCount,
      year: currentYear,
      month: currentMonth,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Cron Error";
    console.error("[CRON MONTHLY FEES ERROR]", err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
