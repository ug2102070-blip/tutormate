"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────
const StudentProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100),
  phone: z
    .string()
    .min(10, "Valid phone number required")
    .max(15)
    .optional()
    .nullable(),
  institution: z.string().max(150).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
});

export type StudentProfileInput = z.infer<typeof StudentProfileSchema>;

export interface StudentProfileDoc {
  id: string;
  fullName: string;
  phone: string | null;
  institution: string | null;
  address: string | null;
  email: string | null;
}

// ─────────────────────────────────────────────
// GET student profile
// ─────────────────────────────────────────────
export async function getStudentProfile(): Promise<StudentProfileDoc | null> {
  const auth = await verifyUserAuth();
  const supabase = createAdminClient();

  // Fetch from students table using auth_uid
  const { data: student, error } = await supabase
    .from("students")
    .select("id, full_name, phone, institution, address")
    .eq("auth_uid", auth.uid)
    .maybeSingle();

  if (error || !student) {
    return null;
  }

  // Also fetch email from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", auth.uid)
    .maybeSingle();

  return {
    id: student.id,
    fullName: student.full_name ?? "",
    phone: student.phone ?? null,
    institution: student.institution ?? null,
    address: student.address ?? null,
    email: profile?.email ?? auth.email ?? null,
  };
}

// ─────────────────────────────────────────────
// UPDATE student profile
// ─────────────────────────────────────────────
export async function updateStudentProfile(input: StudentProfileInput) {
  const auth = await verifyUserAuth();
  const supabase = createAdminClient();

  // Validate
  const parsed = StudentProfileSchema.parse(input);

  // 1. Update Supabase Auth user metadata
  const { error: authError } = await supabase.auth.admin.updateUserById(
    auth.uid,
    {
      user_metadata: { full_name: parsed.fullName },
    }
  );

  if (authError) {
    throw new Error(`Failed to update auth metadata: ${authError.message}`);
  }

  // 2. Update profiles table
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.fullName,
      phone_number: parsed.phone ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.uid);

  if (profileError) {
    throw new Error(`Failed to update profile: ${profileError.message}`);
  }

  // 3. Update students table
  const studentUpdate: Record<string, unknown> = {
    full_name: parsed.fullName,
    phone: parsed.phone ?? null,
    institution: parsed.institution ?? null,
  };

  // Only include address if column exists — silently skip column errors
  if (parsed.address !== undefined) {
    studentUpdate.address = parsed.address ?? null;
  }

  const { error: studentError } = await supabase
    .from("students")
    .update(studentUpdate)
    .eq("auth_uid", auth.uid);

  if (studentError) {
    // If address column doesn't exist, retry without it
    if (
      studentError.message?.includes("address") &&
      studentUpdate.address !== undefined
    ) {
      delete studentUpdate.address;
      const { error: retryError } = await supabase
        .from("students")
        .update(studentUpdate)
        .eq("auth_uid", auth.uid);
      if (retryError) {
        throw new Error(`Failed to update student record: ${retryError.message}`);
      }
    } else {
      throw new Error(`Failed to update student record: ${studentError.message}`);
    }
  }

  return { success: true };
}
