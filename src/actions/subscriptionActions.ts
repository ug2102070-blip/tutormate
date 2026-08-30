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

    // Insert normalized audit history record into subscription_plans table
    try {
      await supabase.from("subscription_plans").insert({
        tutor_id: tutorId,
        plan: newPlan,
        status: "active",
        billing_cycle: billingCycle,
        amount_paid: planSpecs.priceBDT,
        valid_from: now.toISOString(),
        valid_until: validUntilDate.toISOString(),
        payment_method: "online",
      });
    } catch (auditErr) {
      console.warn("[upgradeSubscription] Subscription plan audit insert skipped:", auditErr);
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
    const now = new Date();
    const canceledSubJson = {
      plan: "free_trial",
      status: "canceled",
      validUntil: now.toISOString(),
      maxStudents: freeSpecs.maxStudents,
      maxBatches: freeSpecs.maxBatches,
      allowAiFeatures: freeSpecs.allowAiFeatures,
      priceBDT: 0,
      updatedAt: now.toISOString(),
    };

    const supabase = createAdminClient();
    const { error: updateErr } = await supabase
      .from("tutors")
      .update({ subscription: canceledSubJson })
      .eq("id", tutorId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Insert cancellation audit record
    try {
      await supabase.from("subscription_plans").insert({
        tutor_id: tutorId,
        plan: "free_trial",
        status: "canceled",
        billing_cycle: null,
        amount_paid: 0,
        valid_from: now.toISOString(),
        valid_until: now.toISOString(),
        payment_method: null,
      });
    } catch (auditErr) {
      console.warn("[cancelSubscription] Subscription plan audit insert skipped:", auditErr);
    }

    revalidatePath("/tutor/subscription");
    revalidatePath("/tutor/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to cancel subscription." };
  }
}

/**
 * Retrieves normalized subscription audit history for the authenticated tutor.
 */
export async function getSubscriptionHistory(): Promise<{
  success: boolean;
  history?: Array<{
    id: string;
    plan: string;
    status: string;
    billingCycle: string | null;
    amountPaid: number;
    validFrom: string;
    validUntil: string | null;
    createdAt: string;
  }>;
  error?: string;
}> {
  try {
    const auth = await verifyUserAuth();
    const tutorId = auth.tutorId || auth.uid;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id, plan, status, billing_cycle, amount_paid, valid_from, valid_until, created_at")
      .eq("tutor_id", tutorId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      history: (data || []).map((row) => ({
        id: row.id,
        plan: row.plan,
        status: row.status,
        billingCycle: row.billing_cycle,
        amountPaid: Number(row.amount_paid || 0),
        validFrom: row.valid_from,
        validUntil: row.valid_until,
        createdAt: row.created_at,
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load subscription history." };
  }
}

