"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import type { TutorDoc } from "@/types";

const TutorProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  institution: z.string().max(150).optional().default(""),
  contactPhone: z.string().min(10, "Valid phone number required").max(15),
  bkashNumber: z.string().max(15).optional().nullable(),
  nagadNumber: z.string().max(15).optional().nullable(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional().nullable(),
  address: z.string().max(200, "Address must be less than 200 characters").optional().nullable(),
});

export type TutorProfileInput = z.infer<typeof TutorProfileSchema>;

export async function getTutorProfile(): Promise<TutorDoc | null> {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("tutors")
    .select("*")
    .eq("user_id", auth.uid)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name,
    institution: data.institution,
    contactPhone: data.contact_phone,
    bkashNumber: data.bkash_number,
    nagadNumber: data.nagad_number,
    bio: data.bio,
    address: data.address,
    subscription: data.subscription,
    stats: { totalStudents: 0, activeBatches: 0, pendingDoubtsCount: 0 },
    coachingCenterId: data.coaching_center_id,
    createdAt: data.created_at,
  };
}

export async function updateTutorProfile(input: TutorProfileInput) {
  const auth = await verifyUserAuth();
  const adminSupabase = createAdminClient();

  // Validate input securely
  const parsedData = TutorProfileSchema.parse(input);

  // 1. Update Supabase Auth user metadata
  const { error: authError } = await adminSupabase.auth.admin.updateUserById(auth.uid, {
    user_metadata: { full_name: parsedData.fullName },
  });

  if (authError) {
    throw new Error(`Failed to update auth metadata: ${authError.message}`);
  }

  // 2. Update public.profiles table
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({
      display_name: parsedData.fullName,
      phone_number: parsedData.contactPhone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.uid);

  if (profileError) {
    throw new Error(`Failed to update profile record: ${profileError.message}`);
  }

  // 3. Update public.tutors table
  const { error: tutorError } = await adminSupabase
    .from("tutors")
    .update({
      full_name: parsedData.fullName,
      institution: parsedData.institution || "Independent",
      contact_phone: parsedData.contactPhone,
      bkash_number: parsedData.bkashNumber || null,
      nagad_number: parsedData.nagadNumber || null,
      bio: parsedData.bio || null,
      address: parsedData.address || null,
    })
    .eq("user_id", auth.uid);

  if (tutorError) {
    throw new Error(`Failed to update tutor details: ${tutorError.message}`);
  }

  return { success: true };
}
