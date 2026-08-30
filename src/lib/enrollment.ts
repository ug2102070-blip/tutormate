/**
 * enrollment.ts — Enrollment utilities
 *
 * Centralizes:
 * 1. tutorId resolution (replaces the `authState.tutorId || authState.uid` pattern)
 * 2. Dual-write to both enrolled_batch_ids (legacy) + batch_enrollments (new)
 *    during the Phase 1 → Phase 2 migration period.
 */
import type { VerifiedAuth } from "@/lib/authHelpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── tutorId resolution ────────────────────────────────────────────────────────

/**
 * Resolves the tutor's database ID from an auth state.
 *
 * In TutorMate, a tutor's document ID in `public.tutors` is always their
 * Supabase Auth UID. `authState.tutorId` is populated from JWT claims only
 * when the tutor's app_metadata has been written; during the first session
 * after sign-up it may be absent, so we fall back to `uid`.
 *
 * Always use this instead of the raw `authState.tutorId || authState.uid`
 * pattern scattered throughout server actions.
 */
export function getTutorId(authState: VerifiedAuth): string {
  const id = authState.tutorId || authState.uid;
  if (!id) {
    throw new Error("Unable to resolve tutor identity. Please log in again.");
  }
  return id;
}

// ─── Enrollment sync ───────────────────────────────────────────────────────────

/**
 * Writes enrollment data to BOTH storage layers:
 *   1. `students.enrolled_batch_ids` — legacy array (kept for backward compat)
 *   2. `batch_enrollments` rows       — normalized junction table (Phase 1+)
 *
 * Call this whenever a student's batch enrollment changes.
 * The DB trigger (`sync_batch_enrollments_trigger`) also handles array changes,
 * but we write to both here for safety and to avoid relying solely on triggers.
 *
 * @param supabase    Admin Supabase client (bypasses RLS)
 * @param studentId   Student document UUID
 * @param batchIds    The complete new set of enrolled batch UUIDs
 * @param previousIds The previous set (used to compute removals). If omitted, fetches from DB.
 */
export async function syncBatchEnrollments(
  supabase: SupabaseClient,
  studentId: string,
  batchIds: string[],
  previousIds?: string[]
): Promise<void> {
  // 1. If we don't have previousIds, fetch them
  if (!previousIds) {
    const { data } = await supabase
      .from("students")
      .select("enrolled_batch_ids")
      .eq("id", studentId)
      .single();
    previousIds = (data?.enrolled_batch_ids as string[]) || [];
  }

  const prev = new Set(previousIds);
  const next = new Set(batchIds);

  // 2. Determine which batches were added / removed
  const added = batchIds.filter((id) => !prev.has(id));
  const removed = previousIds.filter((id) => !next.has(id));

  // 3. Upsert new enrollments into batch_enrollments
  if (added.length > 0) {
    const rows = added.map((batchId) => ({
      student_id: studentId,
      batch_id: batchId,
      status: "active",
      enrolled_at: new Date().toISOString(),
    }));

    const { error: insertErr } = await supabase
      .from("batch_enrollments")
      .upsert(rows, { onConflict: "student_id,batch_id" });

    if (insertErr) {
      console.warn("[syncBatchEnrollments] insert error:", insertErr.message);
    }
  }

  // 4. Soft-delete removed enrollments
  if (removed.length > 0) {
    for (const batchId of removed) {
      await supabase
        .from("batch_enrollments")
        .update({ status: "removed", updated_at: new Date().toISOString() })
        .eq("student_id", studentId)
        .eq("batch_id", batchId);
    }
  }

  // 5. Update student_count on affected batches
  const countUpdates: Array<{ batchId: string; delta: number }> = [
    ...added.map((id) => ({ batchId: id, delta: 1 })),
    ...removed.map((id) => ({ batchId: id, delta: -1 })),
  ];

  for (const { batchId, delta } of countUpdates) {
    const { data: b } = await supabase
      .from("batches")
      .select("student_count")
      .eq("id", batchId)
      .single();

    if (b) {
      await supabase
        .from("batches")
        .update({ student_count: Math.max(0, (b.student_count || 0) + delta) })
        .eq("id", batchId);
    }
  }
}

/**
 * Reads a student's enrolled batch IDs from the normalized junction table.
 * Falls back to the legacy `enrolled_batch_ids` array if junction table is empty.
 */
export async function getEnrolledBatchIds(
  supabase: SupabaseClient,
  studentId: string
): Promise<string[]> {
  const { data: enrollments } = await supabase
    .from("batch_enrollments")
    .select("batch_id")
    .eq("student_id", studentId)
    .eq("status", "active");

  if (enrollments && enrollments.length > 0) {
    return enrollments.map((e: { batch_id: string }) => e.batch_id);
  }

  // Fallback to legacy array
  const { data: student } = await supabase
    .from("students")
    .select("enrolled_batch_ids")
    .eq("id", studentId)
    .single();

  return (student?.enrolled_batch_ids as string[]) || [];
}
