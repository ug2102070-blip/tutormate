"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { studentSchema } from "@/lib/validations/student";
import { generateInviteCode } from "@/lib/utils";
import { checkStudentLimit } from "@/lib/serverSubscriptions";
import { revalidatePath } from "next/cache";
import { createSafeAction } from "@/lib/actionHandler";

/**
 * Creates a student record under the authenticated tutor and generates a unique invite code in Supabase.
 */
export const createStudent = createSafeAction(
  studentSchema,
  async (validated, authState) => {
    if (!authState || (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin")) {
      throw new Error("Unauthorized: Only tutors can add students.");
    }
    const tutorId = authState.tutorId || authState.uid;

    // Enforce Subscription Plan Limit for Students
    await checkStudentLimit(tutorId);

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

    revalidatePath("/tutor/students");
    revalidatePath("/tutor/dashboard");
    revalidatePath("/tutor/fees");
    return { studentId: student.id, inviteCode };
  },
  { requireAuth: true }
);

const EmptySchema = z.object({}).optional().default({});

/**
 * Fetches both batches and students for the authenticated tutor.
 */
export const getStudentsPageData = createSafeAction(
  EmptySchema,
  async (_, authState) => {
    if (!authState) {
      throw new Error("Unauthorized");
    }
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

    const batches = (batchRes.data || []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }));
    const students = (studentRes.data || []).map((s: Record<string, any>) => ({
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
  },
  { requireAuth: true }
);

/**
 * Fetches all students for the authenticated tutor reliably server-side.
 */
export const getTutorStudents = createSafeAction(
  EmptySchema,
  async (_, authState) => {
    if (!authState) {
      throw new Error("Unauthorized");
    }
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
  },
  { requireAuth: true }
);
