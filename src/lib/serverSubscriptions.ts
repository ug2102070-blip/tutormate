import { createAdminClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PLANS, normalizeSubscriptionInfo } from "@/lib/subscriptions";

/**
 * Evaluates whether a tutor can add another student based on subscription limits.
 */
export async function checkStudentLimit(tutorId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: tutor } = await supabase
    .from("tutors")
    .select("subscription")
    .eq("id", tutorId)
    .maybeSingle();

  const sub = normalizeSubscriptionInfo(tutor?.subscription);

  const { count, error } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("tutor_id", tutorId)
    .eq("status", "active");

  if (error) {
    console.error("[checkStudentLimit] Count error:", error);
    return;
  }

  const currentCount = count || 0;
  if (currentCount >= sub.maxStudents) {
    const planMeta = SUBSCRIPTION_PLANS[sub.plan];
    throw new Error(
      `Student limit reached (${currentCount}/${sub.maxStudents}) on your ${planMeta.name}. Upgrade your subscription to add more students.`
    );
  }
}

/**
 * Evaluates whether a tutor can create another batch based on subscription limits.
 */
export async function checkBatchLimit(tutorId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: tutor } = await supabase
    .from("tutors")
    .select("subscription")
    .eq("id", tutorId)
    .maybeSingle();

  const sub = normalizeSubscriptionInfo(tutor?.subscription);

  const { count, error } = await supabase
    .from("batches")
    .select("*", { count: "exact", head: true })
    .eq("tutor_id", tutorId)
    .eq("is_archived", false);

  if (error) {
    console.error("[checkBatchLimit] Count error:", error);
    return;
  }

  const currentCount = count || 0;
  if (currentCount >= sub.maxBatches) {
    const planMeta = SUBSCRIPTION_PLANS[sub.plan];
    throw new Error(
      `Batch limit reached (${currentCount}/${sub.maxBatches}) on your ${planMeta.name}. Upgrade your subscription to create more batches.`
    );
  }
}

/**
 * Evaluates whether a tutor has access to AI Assistant features on their plan.
 */
export async function checkAiFeatureAccess(tutorId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: tutor } = await supabase
    .from("tutors")
    .select("subscription")
    .eq("id", tutorId)
    .maybeSingle();

  const sub = normalizeSubscriptionInfo(tutor?.subscription);

  if (!sub.allowAiFeatures) {
    throw new Error(
      "AI Tutor Assistant is available on Starter and Pro subscription plans. Please upgrade your plan to unlock AI features."
    );
  }
}
