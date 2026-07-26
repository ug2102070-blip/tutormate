"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { studentSchema, type StudentFormValues } from "@/lib/validations/student";
import { generateInviteCode } from "@/lib/utils";

/**
 * Creates a student record under the authenticated tutor and generates a unique invite code in Supabase.
 */
export async function createStudent(formData: StudentFormValues, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") {
    throw new Error("Unauthorized: Only tutors can add students.");
  }
  const tutorId = authState.tutorId || authState.uid;
  const validated = studentSchema.parse(formData);
  const inviteCode = generateInviteCode(8);

  const supabase = createAdminClient();

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      tutor_id: tutorId,
      auth_uid: null,
      invite_code: inviteCode,
      full_name: validated.fullName,
      phone: validated.phone,
      guardian_phone: validated.guardianPhone || null,
      institution: validated.institution || null,
      enrolled_batch_ids: validated.enrolledBatchIds,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !student) {
    throw new Error(`Failed to create student: ${error?.message || "Unknown error"}`);
  }

  // Update student_count for enrolled batches
  for (const batchId of validated.enrolledBatchIds) {
    const { data: b } = await supabase.from("batches").select("student_count").eq("id", batchId).single();
    const currentCount = b?.student_count || 0;
    await supabase.from("batches").update({ student_count: currentCount + 1 }).eq("id", batchId);
  }

  return { success: true, studentId: student.id, inviteCode };
}
