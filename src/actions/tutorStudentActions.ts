"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { studentSchema } from "@/lib/validations/student";
import { generateInviteCode } from "@/lib/utils";
import { checkStudentLimit } from "@/lib/serverSubscriptions";
import { getTutorId, syncBatchEnrollments } from "@/lib/enrollment";
import { revalidatePath } from "next/cache";
import { createSafeAction } from "@/lib/actionHandler";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StudentRow {
  id: string;
  tutor_id: string;
  auth_uid: string | null;
  invite_code: string;
  full_name: string;
  phone: string;
  guardian_phone: string | null;
  institution: string | null;
  enrolled_batch_ids: string[];
  status: string;
  created_at: string;
  updated_at?: string;
}

function toStudentDoc(s: StudentRow) {
  return {
    id: s.id,
    tutorId: s.tutor_id,
    authUid: s.auth_uid,
    inviteCode: s.invite_code,
    fullName: s.full_name,
    phone: s.phone,
    guardianPhone: s.guardian_phone,
    institution: s.institution,
    enrolledBatchIds: s.enrolled_batch_ids || [],
    // Narrow DB string → StudentDoc union; default "active" for unknown values
    status: (s.status === "archived" ? "archived" : "active") as "active" | "archived",
    createdAt: s.created_at,
    updatedAt: s.updated_at ?? s.created_at, // always a string after Phase 1 migration
  };
}

// ─── CREATE STUDENT ────────────────────────────────────────────────────────────

/**
 * Creates a student record under the authenticated tutor and generates a unique
 * invite code. Also syncs enrollment to the batch_enrollments junction table.
 */
export const createStudent = createSafeAction(
  studentSchema,
  async (validated, authState) => {
    if (
      !authState ||
      (authState.role !== "tutor" &&
        authState.role !== "owner" &&
        authState.role !== "admin")
    ) {
      throw new Error("Unauthorized: Only tutors can add students.");
    }

    const tutorId = getTutorId(authState);
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

    // Sync to normalized batch_enrollments junction table
    await syncBatchEnrollments(supabase, student.id, validated.enrolledBatchIds, []);

    revalidatePath("/tutor/students");
    revalidatePath("/tutor/dashboard");
    revalidatePath("/tutor/fees");
    return { studentId: student.id, inviteCode };
  },
  { requireAuth: true }
);

// ─── UPDATE STUDENT ENROLLMENT ─────────────────────────────────────────────────

const UpdateEnrollmentSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  batchIds: z.array(z.string().uuid("Invalid batch ID")),
});

/**
 * Updates a student's batch enrollment. Writes to both enrolled_batch_ids and
 * batch_enrollments to maintain backward compatibility during migration.
 */
export const updateStudentEnrollment = createSafeAction(
  UpdateEnrollmentSchema,
  async ({ studentId, batchIds }, authState) => {
    if (!authState) throw new Error("Unauthorized");
    const tutorId = getTutorId(authState);
    const supabase = createAdminClient();

    // Verify student belongs to this tutor
    const { data: existing, error: fetchErr } = await supabase
      .from("students")
      .select("id, enrolled_batch_ids")
      .eq("id", studentId)
      .eq("tutor_id", tutorId)
      .single();

    if (fetchErr || !existing) {
      throw new Error("Student not found or unauthorized.");
    }

    const previousIds = (existing.enrolled_batch_ids as string[]) || [];

    // Update enrolled_batch_ids on student
    const { error: updateErr } = await supabase
      .from("students")
      .update({ enrolled_batch_ids: batchIds })
      .eq("id", studentId)
      .eq("tutor_id", tutorId);

    if (updateErr) {
      throw new Error(`Failed to update enrollment: ${updateErr.message}`);
    }

    // Sync to batch_enrollments junction table
    await syncBatchEnrollments(supabase, studentId, batchIds, previousIds);

    revalidatePath("/tutor/students");
    revalidatePath("/tutor/attendance");
    return { success: true };
  },
  { requireAuth: true }
);

// ─── GET STUDENTS PAGE DATA ────────────────────────────────────────────────────

const EmptySchema = z.object({}).optional().default({});

/**
 * Fetches both batches and students for the authenticated tutor.
 */
export const getStudentsPageData = createSafeAction(
  EmptySchema,
  async (_, authState) => {
    if (!authState) throw new Error("Unauthorized");
    const tutorId = getTutorId(authState);
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
        .select(
          "id, tutor_id, auth_uid, invite_code, full_name, phone, guardian_phone, institution, enrolled_batch_ids, status, created_at, updated_at"
        )
        .eq("tutor_id", tutorId)
        .order("created_at", { ascending: false }),
    ]);

    const batches = (batchRes.data || []).map((b: { id: string; name: string }) => ({
      id: b.id,
      name: b.name,
    }));

    const students = (studentRes.data as StudentRow[] || []).map(toStudentDoc);

    return { batches, students };
  },
  { requireAuth: true }
);

// ─── GET TUTOR STUDENTS ────────────────────────────────────────────────────────

/**
 * Fetches all students for the authenticated tutor.
 */
export const getTutorStudents = createSafeAction(
  EmptySchema,
  async (_, authState) => {
    if (!authState) throw new Error("Unauthorized");
    const tutorId = getTutorId(authState);
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from("students")
      .select(
        "id, tutor_id, auth_uid, invite_code, full_name, phone, guardian_phone, institution, enrolled_batch_ids, status, created_at, updated_at"
      )
      .eq("tutor_id", tutorId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return (data as StudentRow[]).map(toStudentDoc);
  },
  { requireAuth: true }
);

// ─── LOOKUP PROFILE BY PHONE ───────────────────────────────────────────────────

const LookupByPhoneSchema = z.object({
  phone: z.string().min(7, "Phone number too short").max(20),
});

/**
 * Looks up an existing TutorMate profile or student record by phone number.
 * Used by tutors to find students/parents before linking.
 */
export const lookupProfileByPhone = createSafeAction(
  LookupByPhoneSchema,
  async ({ phone }, authState) => {
    if (!authState) throw new Error("Unauthorized");
    const supabase = createAdminClient();

    // Normalize: strip spaces, dashes; keep leading digits
    const normalized = phone.replace(/[\s\-()]/g, "");
    // Also try without country code prefix
    const localForm = normalized.replace(/^\+?880?/, "0");

    // Search profiles table by phone_number
    const { data: profileMatch } = await supabase
      .from("profiles")
      .select("id, display_name, email, phone_number, role")
      .or(`phone_number.eq.${normalized},phone_number.eq.${localForm}`)
      .in("role", ["student", "parent"])
      .limit(1)
      .maybeSingle();

    if (profileMatch) {
      return {
        found: true as const,
        type: "profile" as const,
        profile: {
          uid: profileMatch.id,
          displayName: profileMatch.display_name || "Unknown",
          email: profileMatch.email || "",
          phone: profileMatch.phone_number || phone,
          role: profileMatch.role as "student" | "parent",
        },
      };
    }

    // Also search students table by phone (even if not yet registered)
    const tutorId = authState.tutorId || authState.uid;
    const { data: studentMatch } = await supabase
      .from("students")
      .select("id, full_name, phone, auth_uid, invite_code")
      .eq("tutor_id", tutorId)
      .or(`phone.eq.${normalized},phone.eq.${localForm}`)
      .limit(1)
      .maybeSingle();

    if (studentMatch) {
      return {
        found: true as const,
        type: "existing_student" as const,
        existingStudent: {
          id: studentMatch.id,
          fullName: studentMatch.full_name,
          phone: studentMatch.phone,
          authUid: studentMatch.auth_uid,
          inviteCode: studentMatch.invite_code,
        },
      };
    }

    return { found: false as const };
  },
  { requireAuth: true }
);

// ─── LINK EXISTING PROFILE AS STUDENT ─────────────────────────────────────────

const LinkProfileAsStudentSchema = z.object({
  profileUid: z.string().uuid("Invalid profile UID"),
  batchIds: z.array(z.string().uuid()).min(1, "Select at least one batch"),
  guardianPhone: z.string().optional().nullable(),
  institution: z.string().optional().nullable(),
});

/**
 * Links an existing TutorMate profile to this tutor's student list.
 * Creates a student record pointing to the existing auth profile.
 */
export const linkProfileAsStudent = createSafeAction(
  LinkProfileAsStudentSchema,
  async ({ profileUid, batchIds, guardianPhone, institution }, authState) => {
    if (
      !authState ||
      (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin")
    ) {
      throw new Error("Unauthorized: Only tutors can add students.");
    }

    const tutorId = authState.tutorId || authState.uid;
    await checkStudentLimit(tutorId);
    const supabase = createAdminClient();

    // Fetch the profile details
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, display_name, phone_number")
      .eq("id", profileUid)
      .single();

    if (profileErr || !profile) {
      throw new Error("Profile not found.");
    }

    // Check if this profile is already a student under this tutor
    const { data: existing } = await supabase
      .from("students")
      .select("id, invite_code")
      .eq("tutor_id", tutorId)
      .eq("auth_uid", profileUid)
      .maybeSingle();

    if (existing) {
      return { studentId: existing.id, inviteCode: existing.invite_code, alreadyLinked: true };
    }

    const inviteCode = generateInviteCode(8);

    const { data: student, error } = await supabase
      .from("students")
      .insert({
        tutor_id: tutorId,
        auth_uid: profileUid,
        invite_code: inviteCode,
        full_name: profile.display_name || "Student",
        phone: profile.phone_number || "",
        guardian_phone: guardianPhone || null,
        institution: institution || null,
        enrolled_batch_ids: batchIds,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !student) {
      throw new Error(`Failed to link student: ${error?.message || "Unknown error"}`);
    }

    await syncBatchEnrollments(supabase, student.id, batchIds, []);

    revalidatePath("/tutor/students");
    revalidatePath("/tutor/dashboard");
    return { studentId: student.id, inviteCode, alreadyLinked: false };
  },
  { requireAuth: true }
);

// ─── GENERATE PARENT INVITE LINKS ─────────────────────────────────────────────

const GenerateParentInviteSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
});

/**
 * Returns the invite code and all share links for parent onboarding:
 * WhatsApp direct link, SMS link, copyable join URL.
 */
export const generateParentInvite = createSafeAction(
  GenerateParentInviteSchema,
  async ({ studentId }, authState) => {
    if (!authState) throw new Error("Unauthorized");
    const tutorId = authState.tutorId || authState.uid;
    const supabase = createAdminClient();

    // Verify student belongs to this tutor
    const { data: student, error } = await supabase
      .from("students")
      .select("id, full_name, invite_code, guardian_phone")
      .eq("id", studentId)
      .eq("tutor_id", tutorId)
      .single();

    if (error || !student) {
      throw new Error("Student not found or unauthorized.");
    }

    const inviteCode = student.invite_code;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tutormate.app";
    const joinUrl = `${baseUrl}/join?code=${inviteCode}&role=parent`;

    const rawMessage =
      `আপনাকে TutorMate-এ আমন্ত্রণ জানানো হচ্ছে!\n` +
      `${student.full_name}-এর অভিভাবক হিসেবে যোগ দিন এবং তার পড়াশোনার অগ্রগতি সরাসরি ট্র্যাক করুন।\n\n` +
      `👉 এখানে ক্লিক করুন: ${joinUrl}`;

    const encodedMessage = encodeURIComponent(rawMessage);

    // Normalize guardian phone for WhatsApp (ensure BD country code)
    let whatsappPhone = (student.guardian_phone || "").replace(/[\s\-()]/g, "");
    if (whatsappPhone.startsWith("01") && whatsappPhone.length === 11) {
      whatsappPhone = `88${whatsappPhone}`;
    } else if (whatsappPhone.startsWith("+")) {
      whatsappPhone = whatsappPhone.slice(1);
    }

    return {
      studentName: student.full_name,
      inviteCode,
      joinUrl,
      guardianPhone: student.guardian_phone,
      whatsappLink: whatsappPhone
        ? `https://wa.me/${whatsappPhone}?text=${encodedMessage}`
        : `https://wa.me/?text=${encodedMessage}`,
      smsLink: student.guardian_phone
        ? `sms:${student.guardian_phone}?body=${encodedMessage}`
        : null,
    };
  },
  { requireAuth: true }
);
