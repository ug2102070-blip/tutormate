import { createAdminClient } from "@/lib/supabase/server";

/**
 * Synchronizes a student's enrolled batches with the relational `batch_enrollments` junction table.
 */
export async function syncStudentBatchEnrollments(
  studentId: string,
  batchIds: string[]
): Promise<void> {
  if (!studentId) return;

  const supabase = createAdminClient();

  try {
    // 1. Delete existing enrollments for this student
    await supabase.from("batch_enrollments").delete().eq("student_id", studentId);

    // 2. Insert new enrollment rows
    if (batchIds && batchIds.length > 0) {
      const rows = batchIds.map((batchId) => ({
        student_id: studentId,
        batch_id: batchId,
        enrolled_at: new Date().toISOString(),
      }));

      await supabase.from("batch_enrollments").insert(rows);
    }
  } catch (err) {
    console.error("[syncStudentBatchEnrollments] Error syncing enrollments:", err);
  }
}
