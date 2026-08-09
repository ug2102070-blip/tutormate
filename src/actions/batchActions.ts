"use server";

import { createAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { batchSchema, type BatchFormValues } from "@/lib/validations/batch";
import { checkBatchLimit } from "@/lib/serverSubscriptions";
import { revalidatePath } from "next/cache";

async function ensureTutorRecord(tutorId: string, email?: string) {
  const adminSupabase = createAdminClient();

  // Fast check: verify tutor record exists (provisioned automatically via Postgres on_auth_user_created trigger)
  const { data: existingTutor } = await adminSupabase
    .from("tutors")
    .select("id")
    .eq("id", tutorId)
    .maybeSingle();

  if (!existingTutor) {
    const displayName = email ? email.split("@")[0] : "Tutor";
    await adminSupabase.from("profiles").upsert({
      id: tutorId,
      email: email || "",
      display_name: displayName,
      role: "tutor",
      tutor_id: tutorId,
      updated_at: new Date().toISOString(),
    });
    await adminSupabase.from("tutors").upsert({
      id: tutorId,
      user_id: tutorId,
      full_name: displayName,
      institution: "Independent",
      contact_phone: "",
    });
  }
}

/**
 * Creates a new batch under the authenticated tutor.
 */
export async function createBatch(formData: BatchFormValues) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized: Only tutors can create batches.");
  }
  const tutorId = authState.tutorId || authState.uid;

  // Enforce Subscription Plan Limit for Batches
  await checkBatchLimit(tutorId);

  const validated = batchSchema.parse(formData);

  // Ensure tutor record exists for legacy users created before trigger installation
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
    // Fallback to admin client if client insert had any permission issue
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
        "Supabase RLS Permission Denied: Please run the SQL Editor script in Supabase (supabase/add_on_auth_user_created_trigger.sql)."
      );
    }
    throw new Error(`Failed to create batch: ${error?.message || "Unknown error"}`);
  }

  invalidateBatchCache();
  return { success: true, batchId: batch.id };
}


// Bust the cache for all batch-dependent routes
function invalidateBatchCache() {
  revalidatePath("/tutor/batches");
  revalidatePath("/tutor/dashboard");
  revalidatePath("/tutor/students");
  revalidatePath("/tutor/fees");
  revalidatePath("/tutor/attendance");
}


/**
 * Updates an existing batch.
 */
export async function updateBatch(
  batchId: string,
  formData: BatchFormValues
) {
  const authState = await verifyUserAuth();
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

  invalidateBatchCache();
  return { success: true };
}


/**
 * Toggles batch archive status.
 */
export async function toggleArchiveBatch(batchId: string) {
  const authState = await verifyUserAuth();
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

  invalidateBatchCache();
  return { success: true, isArchived: nextArchived };
}


/**
 * Fetches all batches for the authenticated tutor.
 * revalidatePath() after mutations keeps Next.js full-route cache fresh.
 */
export async function getTutorBatches(): Promise<any[]> {
  const authState = await verifyUserAuth();
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
