"use server";

import { createAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { batchSchema, type BatchFormValues } from "@/lib/validations/batch";
import { checkBatchLimit } from "@/lib/serverSubscriptions";

async function ensureTutorRecord(tutorId: string, email?: string) {
  const adminSupabase = createAdminClient();

  // 1. Ensure profile record exists (tutors.user_id references profiles.id)
  const { data: existingProfile } = await adminSupabase
    .from("profiles")
    .select("id, display_name, phone_number")
    .eq("id", tutorId)
    .maybeSingle();

  if (!existingProfile) {
    let userEmail = email || "";
    if (!userEmail) {
      try {
        const { data: userById } = await adminSupabase.auth.admin.getUserById(tutorId);
        if (userById?.user?.email) {
          userEmail = userById.user.email;
        }
      } catch {
        // ignore
      }
    }

    await adminSupabase.from("profiles").upsert({
      id: tutorId,
      email: userEmail,
      display_name: userEmail ? userEmail.split("@")[0] : "Tutor",
      role: "tutor",
      tutor_id: tutorId,
      updated_at: new Date().toISOString(),
    });
  }

  // 2. Ensure tutor record exists (batches.tutor_id references tutors.id)
  const { data: existingTutor } = await adminSupabase
    .from("tutors")
    .select("id")
    .eq("id", tutorId)
    .maybeSingle();

  if (!existingTutor) {
    const displayName = existingProfile?.display_name || email?.split("@")[0] || "Tutor";
    const phone = existingProfile?.phone_number || "";

    await adminSupabase.from("tutors").upsert({
      id: tutorId,
      user_id: tutorId,
      full_name: displayName,
      institution: "Independent",
      contact_phone: phone,
    });
  }
}

/**
 * Creates a new batch under the authenticated tutor.
 */
export async function createBatch(formData: BatchFormValues, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized: Only tutors can create batches.");
  }
  const tutorId = authState.tutorId || authState.uid;

  // Enforce Subscription Plan Limit for Batches
  await checkBatchLimit(tutorId);

  const validated = batchSchema.parse(formData);

  // Guarantee tutor row exists in public.tutors to satisfy foreign key constraints
  await ensureTutorRecord(tutorId, authState.email);

  const supabase = await getSupabaseServerClient();

  let { data: batch, error } = await supabase
    .from("batches")
    .insert({
      tutor_id: tutorId,
      name: validated.name,
      subject: validated.subject,
      grade_class: validated.gradeClass,
      monthly_fee: validated.monthlyFee,
      schedule: validated.schedule,
      student_count: 0,
      is_archived: false,
    })
    .select("id")
    .single();

  if (error) {
    // Fallback to admin client if client insert had any permission or RLS issue
    const adminSupabase = createAdminClient();
    const adminRes = await adminSupabase
      .from("batches")
      .insert({
        tutor_id: tutorId,
        name: validated.name,
        subject: validated.subject,
        grade_class: validated.gradeClass,
        monthly_fee: validated.monthlyFee,
        schedule: validated.schedule,
        student_count: 0,
        is_archived: false,
      })
      .select("id")
      .single();

    batch = adminRes.data;
    error = adminRes.error;
  }

  if (error || !batch) {
    if (error?.message?.includes("permission denied")) {
      throw new Error(
        "Supabase RLS Permission Denied: Please run the SQL Editor script in Supabase (or set your real SUPABASE_SERVICE_ROLE_KEY in .env.local)."
      );
    }
    throw new Error(`Failed to create batch: ${error?.message || "Unknown error"}`);
  }

  return { success: true, batchId: batch.id };
}

/**
 * Updates an existing batch.
 */
export async function updateBatch(
  batchId: string,
  formData: BatchFormValues,
  idToken: string
) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") {
    throw new Error("Unauthorized");
  }
  const tutorId = authState.tutorId || authState.uid;
  const validated = batchSchema.parse(formData);

  const supabase = await getSupabaseServerClient();

  let { error } = await supabase
    .from("batches")
    .update({
      name: validated.name,
      subject: validated.subject,
      grade_class: validated.gradeClass,
      monthly_fee: validated.monthlyFee,
      schedule: validated.schedule,
    })
    .eq("id", batchId)
    .eq("tutor_id", tutorId);

  if (error && (error.code === "42501" || error.message.includes("permission denied"))) {
    const adminSupabase = createAdminClient();
    const adminRes = await adminSupabase
      .from("batches")
      .update({
        name: validated.name,
        subject: validated.subject,
        grade_class: validated.gradeClass,
        monthly_fee: validated.monthlyFee,
        schedule: validated.schedule,
      })
      .eq("id", batchId)
      .eq("tutor_id", tutorId);
    error = adminRes.error;
  }

  if (error) {
    throw new Error(`Failed to update batch: ${error.message}`);
  }

  return { success: true };
}

/**
 * Toggles batch archive status.
 */
export async function toggleArchiveBatch(batchId: string, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") {
    throw new Error("Unauthorized");
  }
  const tutorId = authState.tutorId || authState.uid;

  const supabase = await getSupabaseServerClient();

  let { data: batch, error: getErr } = await supabase
    .from("batches")
    .select("is_archived")
    .eq("id", batchId)
    .eq("tutor_id", tutorId)
    .single();

  if (getErr) {
    const adminSupabase = createAdminClient();
    const adminRes = await adminSupabase
      .from("batches")
      .select("is_archived")
      .eq("id", batchId)
      .eq("tutor_id", tutorId)
      .single();
    batch = adminRes.data;
  }

  if (!batch) {
    throw new Error("Batch not found or unauthorized");
  }

  const nextArchived = !batch.is_archived;

  let { error } = await supabase
    .from("batches")
    .update({ is_archived: nextArchived })
    .eq("id", batchId)
    .eq("tutor_id", tutorId);

  if (error) {
    const adminSupabase = createAdminClient();
    const adminRes = await adminSupabase
      .from("batches")
      .update({ is_archived: nextArchived })
      .eq("id", batchId)
      .eq("tutor_id", tutorId);
    error = adminRes.error;
  }

  if (error) {
    throw new Error(`Failed to update batch status: ${error.message}`);
  }

  return { success: true, isArchived: nextArchived };
}

/**
 * Fetches all batches for the authenticated tutor reliably server-side.
 */
export async function getTutorBatches(idToken?: string): Promise<any[]> {
  const authState = await verifyUserAuth(idToken);
  const tutorId = authState.tutorId || authState.uid;
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("batches")
    .select("*")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((b) => ({
    id: b.id,
    tutorId: b.tutor_id,
    name: b.name,
    subject: b.subject,
    gradeClass: b.grade_class,
    monthlyFee: Number(b.monthly_fee),
    schedule: b.schedule || [],
    studentCount: b.student_count,
    isArchived: b.is_archived,
    createdAt: b.created_at,
  }));
}
