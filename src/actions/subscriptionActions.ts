"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import {
  SUBSCRIPTION_PLANS,
  normalizeSubscriptionInfo,
  type PlanType,
} from "@/lib/subscriptions";
import type { SubscriptionInfo } from "@/types";

export interface SubscriptionUsageData {
  subscription: SubscriptionInfo;
  activeStudents: number;
  maxStudents: number;
  studentUsagePct: number;
  activeBatches: number;
  maxBatches: number;
  batchUsagePct: number;
  allowAiFeatures: boolean;
}

/**
 * Fetches current tutor subscription information, live student count, and batch usage metrics.
 */
export async function getSubscriptionUsage(): Promise<{ success: boolean; data?: SubscriptionUsageData; error?: string }> {
  try {
    const auth = await verifyUserAuth();
    const tutorId = auth.tutorId || auth.uid;

    const supabase = createAdminClient();

    // 1. Fetch tutor subscription column
    const { data: tutor } = await supabase
      .from("tutors")
      .select("subscription")
      .eq("id", tutorId)
      .maybeSingle();

    const sub = normalizeSubscriptionInfo(tutor?.subscription);

    // 2. Count active students
    const { count: studentCount } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("tutor_id", tutorId)
      .eq("status", "active");

    // 3. Count active batches
    const { count: batchCount } = await supabase
      .from("batches")
      .select("*", { count: "exact", head: true })
      .eq("tutor_id", tutorId)
      .eq("is_archived", false);

    const activeStudents = studentCount || 0;
    const activeBatches = batchCount || 0;

    const studentUsagePct = Math.min(
      100,
      Math.round((activeStudents / (sub.maxStudents || 1)) * 100)
    );
    const batchUsagePct = Math.min(
      100,
      Math.round((activeBatches / (sub.maxBatches || 1)) * 100)
    );

    return {
      success: true,
      data: {
        subscription: sub,
        activeStudents,
        maxStudents: sub.maxStudents,
        studentUsagePct,
        activeBatches,
        maxBatches: sub.maxBatches,
        batchUsagePct,
        allowAiFeatures: sub.allowAiFeatures,
      },
    };
  } catch (err: any) {
    console.error("[getSubscriptionUsage] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to load subscription usage metrics.",
    };
  }
}

/**
 * Upgrades or modifies a tutor's subscription plan.
 */
export async function upgradeSubscription(
  newPlan: PlanType,
  billingCycle: "monthly" | "yearly" = "monthly"
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyUserAuth();
    const tutorId = auth.tutorId || auth.uid;

    if (!(newPlan in SUBSCRIPTION_PLANS)) {
      return { success: false, error: "Invalid subscription plan selected." };
    }

    const planSpecs = SUBSCRIPTION_PLANS[newPlan];

    // Compute validUntil date
    const now = new Date();
    const daysToAdd = billingCycle === "yearly" ? 365 : 30;
    const validUntilDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const updatedSubJson = {
      plan: newPlan,
      status: "active",
      validUntil: validUntilDate.toISOString(),
      maxStudents: planSpecs.maxStudents,
      maxBatches: planSpecs.maxBatches,
      allowAiFeatures: planSpecs.allowAiFeatures,
      priceBDT: planSpecs.priceBDT,
      billingCycle,
      updatedAt: now.toISOString(),
    };

    const supabase = createAdminClient();

    // Ensure tutor record exists
    const { data: existingTutor } = await supabase
      .from("tutors")
      .select("id")
      .eq("id", tutorId)
      .maybeSingle();

    if (!existingTutor) {
      await supabase.from("tutors").upsert({
        id: tutorId,
        user_id: auth.uid,
        full_name: auth.email?.split("@")[0] || "Tutor",
        institution: "Independent",
        contact_phone: "",
        subscription: updatedSubJson,
      });
    } else {
      const { error: updateErr } = await supabase
        .from("tutors")
        .update({ subscription: updatedSubJson })
        .eq("id", tutorId);

      if (updateErr) {
        console.error("[upgradeSubscription] Update error:", updateErr);
        return { success: false, error: updateErr.message };
      }
    }

    revalidatePath("/tutor/subscription");
    revalidatePath("/tutor/settings");
    revalidatePath("/tutor/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("[upgradeSubscription] Error:", err);
    return { success: false, error: err.message || "Failed to upgrade subscription plan." };
  }
}

/**
 * Cancels or resets subscription to Free Trial tier.
 */
export async function cancelSubscription(): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyUserAuth();
    const tutorId = auth.tutorId || auth.uid;

    const freeSpecs = SUBSCRIPTION_PLANS.free_trial;
    const canceledSubJson = {
      plan: "free_trial",
      status: "canceled",
      validUntil: new Date().toISOString(),
      maxStudents: freeSpecs.maxStudents,
      maxBatches: freeSpecs.maxBatches,
      allowAiFeatures: freeSpecs.allowAiFeatures,
      priceBDT: 0,
      updatedAt: new Date().toISOString(),
    };

    const supabase = createAdminClient();
    const { error: updateErr } = await supabase
      .from("tutors")
      .update({ subscription: canceledSubJson })
      .eq("id", tutorId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    revalidatePath("/tutor/subscription");
    revalidatePath("/tutor/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to cancel subscription." };
  }
}
