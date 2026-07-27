import type { SubscriptionInfo } from "@/types";

export type PlanType = "free_trial" | "starter" | "pro";

export interface PlanMetadata {
  plan: PlanType;
  name: string;
  maxStudents: number;
  maxBatches: number;
  allowAiFeatures: boolean;
  priceBDT: number;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<PlanType, PlanMetadata> = {
  free_trial: {
    plan: "free_trial",
    name: "Free Trial",
    maxStudents: 20,
    maxBatches: 2,
    allowAiFeatures: false,
    priceBDT: 0,
    description: "Ideal for individual tutors trying out TutorMate features.",
    features: [
      "Up to 20 Enrolled Students",
      "Up to 2 Active Batches",
      "Attendance & Fee Tracking",
      "Study Materials Upload",
      "Assignments & Exams",
    ],
  },
  starter: {
    plan: "starter",
    name: "Starter Plan",
    maxStudents: 100,
    maxBatches: 10,
    allowAiFeatures: true,
    priceBDT: 299,
    description: "Best for growing private tutors and home batch leaders.",
    features: [
      "Up to 100 Enrolled Students",
      "Up to 10 Active Batches",
      "AI Tutor Assistant 🤖",
      "Exam Leaderboard & Rank Engine",
      "QR Code Attendance System",
      "Standard Email/SMS Support",
    ],
  },
  pro: {
    plan: "pro",
    name: "Pro Plan",
    maxStudents: 999999,
    maxBatches: 999999,
    allowAiFeatures: true,
    priceBDT: 699,
    description: "Built for coaching centers, multi-tutor hubs, and enterprise scale.",
    features: [
      "Unlimited Students",
      "Unlimited Active Batches",
      "Full AI Tutor Assistant Suite 🤖",
      "Multi-Tutor / Coaching Center Mode 🏫",
      "Role Permissions Engine 🔑",
      "Priority 24/7 Support & Custom Branding",
    ],
  },
};

/**
 * Normalizes subscription JSONB data into a complete SubscriptionInfo object.
 */
export function normalizeSubscriptionInfo(rawSub?: any): SubscriptionInfo {
  const plan: PlanType =
    rawSub?.plan && rawSub.plan in SUBSCRIPTION_PLANS ? rawSub.plan : "free_trial";
  const specs = SUBSCRIPTION_PLANS[plan];

  return {
    plan,
    status: rawSub?.status || "active",
    validUntil: rawSub?.validUntil || "2099-12-31T23:59:59Z",
    maxStudents: rawSub?.maxStudents ?? specs.maxStudents,
    maxBatches: rawSub?.maxBatches ?? specs.maxBatches,
    allowAiFeatures: rawSub?.allowAiFeatures ?? specs.allowAiFeatures,
    priceBDT: rawSub?.priceBDT ?? specs.priceBDT,
  };
}
