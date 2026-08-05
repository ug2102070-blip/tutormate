"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { studentSchema, type StudentFormValues } from "@/lib/validations/student";
import { generateInviteCode } from "@/lib/utils";
import { checkStudentLimit } from "@/lib/serverSubscriptions";

/**
 * Creates a student record under the authenticated tutor and generates a unique invite code in Supabase.
 */
export async function createStudent(formData: StudentFormValues) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized: Only tutors can add students.");
  }
  const tutorId = authState.tutorId || authState.uid;

  // Enforce Subscription Plan Limit for Students
  await checkStudentLimit(tutorId);

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

/**
 * Fetches both batches and students for the authenticated tutor in a single
 * server-side round-trip. Avoids parallel Server Action calls (Promise.all)
 * from the client, and ensures cookies() is called in a valid request context.
 */
export async function getStudentsPageData(): Promise<{
  batches: { id: string; name: string }[];
  students: any[];
}> {
  const authState = await verifyUserAuth();
  const tutorId = authState.tutorId || authState.uid;
  const adminSupabase = createAdminClient();

  const [batchRes, studentRes] = await Promise.all([
    adminSupabase
      .from("batches")
      .select("id, name")
      .eq("tutor_id", tutorId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("students")
      .select("*")
      .eq("tutor_id", tutorId)
      .order("created_at", { ascending: false }),
  ]);

  const batches = (batchRes.data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
  }));

  const students = (studentRes.data || []).map((s: any) => ({
    id: s.id,
    tutorId: s.tutor_id,
    authUid: s.auth_uid,
    inviteCode: s.invite_code,
    fullName: s.full_name,
    phone: s.phone,
    guardianPhone: s.guardian_phone,
    institution: s.institution,
    enrolledBatchIds: s.enrolled_batch_ids || [],
    status: s.status,
    createdAt: s.created_at,
  }));

  return { batches, students };
}

/**
 * Fetches all students for the authenticated tutor reliably server-side.
 */
export async function getTutorStudents(): Promise<any[]> {
  const authState = await verifyUserAuth();
  const tutorId = authState.tutorId || authState.uid;
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("students")
    .select("*")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((s) => ({
    id: s.id,
    tutorId: s.tutor_id,
    authUid: s.auth_uid,
    inviteCode: s.invite_code,
    fullName: s.full_name,
    phone: s.phone,
    guardianPhone: s.guardian_phone,
    institution: s.institution,
    enrolledBatchIds: s.enrolled_batch_ids || [],
    status: s.status,
    createdAt: s.created_at,
  }));
}
