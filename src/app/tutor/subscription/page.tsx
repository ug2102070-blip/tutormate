"use client";

import { useEffect, useState } from "react";
import {
  Gem,
  CheckCircle2,
  XCircle,
  Users,
  Building2,
  Sparkles,
  Zap,
  ShieldCheck,
  CreditCard,
  Check,
  ArrowRight,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  getSubscriptionUsage,
  upgradeSubscription,
  cancelSubscription,
  type SubscriptionUsageData,
} from "@/actions/subscriptionActions";
import { SUBSCRIPTION_PLANS, type PlanType } from "@/lib/subscriptions";
import { useLanguage } from "@/context/LanguageContext";

export default function SubscriptionPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<SubscriptionUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad" | "card">("bkash");
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    const res = await getSubscriptionUsage();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error || "Failed to fetch subscription data.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenUpgradeModal = (plan: PlanType) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;
    setActionLoading(true);
    const res = await upgradeSubscription(selectedPlan, billingCycle);
    if (res.success) {
      showToast(`Successfully upgraded to ${SUBSCRIPTION_PLANS[selectedPlan].name}! 🎉`);
      setIsModalOpen(false);
      await fetchUsage();
    } else {
      showToast(res.error || "Failed to process plan upgrade.", "error");
    }
    setActionLoading(false);
  };

  const currentPlanType = data?.subscription?.plan || "free_trial";

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 text-sm font-semibold transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toastMessage.text}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="p-2 rounded-xl text-primary"
              style={{ background: "var(--color-primary-50)" }}
            >
              <Gem className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t("subscription.title") || "Subscription System & Limits"}
            </h1>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            {t("subscription.subtitle") || "Monitor student & batch usage capacity, review subscription tiers, and upgrade your tutoring plan."}
          </p>
        </div>

        <button
          onClick={fetchUsage}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all hover:bg-black/5 dark:hover:bg-white/5"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Usage
        </button>
      </div>

      {/* Section 1: Live Usage Meters & Capacity Visualizer */}
      <div
        className="p-6 rounded-2xl border space-y-6 shadow-sm"
        style={{
          background: "var(--color-card-bg)",
          borderColor: "var(--color-card-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> Current Plan Usage & Limits
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Tier:</span>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              {SUBSCRIPTION_PLANS[currentPlanType]?.name || "Free Trial"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
              Loading capacity metrics...
            </span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Capacity Meter */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <Users className="w-4 h-4 text-blue-500" /> Student Capacity
                </span>
                <span className="text-gray-500">
                  {data.activeStudents} / {data.maxStudents >= 999999 ? "∞" : data.maxStudents} Used
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.studentUsagePct >= 90
                      ? "bg-rose-500"
                      : data.studentUsagePct >= 70
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${data.maxStudents >= 999999 ? 15 : data.studentUsagePct}%` }}
                />
              </div>
              <div className="text-[11px] text-gray-500 font-medium">
                {data.maxStudents >= 999999
                  ? "Unlimited student registrations enabled."
                  : `${data.maxStudents - data.activeStudents} student slots remaining on current plan.`}
              </div>
            </div>

            {/* Batch Capacity Meter */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <Building2 className="w-4 h-4 text-emerald-500" /> Active Batches Limit
                </span>
                <span className="text-gray-500">
                  {data.activeBatches} / {data.maxBatches >= 999999 ? "∞" : data.maxBatches} Used
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.batchUsagePct >= 90
                      ? "bg-rose-500"
                      : data.batchUsagePct >= 70
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${data.maxBatches >= 999999 ? 20 : data.batchUsagePct}%` }}
                />
              </div>
              <div className="text-[11px] text-gray-500 font-medium">
                {data.maxBatches >= 999999
                  ? "Unlimited active batches enabled."
                  : `${data.maxBatches - data.activeBatches} batch slots available.`}
              </div>
            </div>

            {/* AI Assistant Access Indicator */}
            <div
              className="p-4 rounded-xl border space-y-3 flex flex-col justify-between"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <Sparkles className="w-4 h-4 text-purple-500" /> AI Tutor Assistant 🤖
                </span>
                {data.allowAiFeatures ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-500">
                    Unlocked
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-500">
                    Locked
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {data.allowAiFeatures
                  ? "AI question generator, lesson planning, and answer drafting are active."
                  : "Upgrade to Starter or Pro plan to unlock Gemini AI Tutor generation features."}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Section 2: Billing Cycle Switcher & Plan Matrix */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold">Available Subscription Plans</h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Choose a plan that fits your tutoring scale. Upgrade or downgrade anytime with instant feature activation.
            </p>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl border bg-black/5 dark:bg-white/5 border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                billingCycle === "monthly"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                billingCycle === "yearly"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Yearly Billing
              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-extrabold">
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["free_trial", "starter", "pro"] as PlanType[]).map((planKey) => {
            const plan = SUBSCRIPTION_PLANS[planKey];
            const isCurrent = currentPlanType === planKey;
            const isPopular = planKey === "starter";

            let monthlyPrice = plan.priceBDT;
            if (billingCycle === "yearly" && monthlyPrice > 0) {
              monthlyPrice = Math.round(monthlyPrice * 0.85);
            }

            return (
              <div
                key={planKey}
                className={`relative p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all duration-200 ${
                  isPopular
                    ? "border-primary shadow-xl ring-2 ring-primary/20"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
                style={{ background: "var(--color-card-bg)" }}
              >
                {/* Badges */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] uppercase font-extrabold bg-primary text-white shadow-md tracking-wider">
                    ⭐ Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  {/* Title & Price */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-extrabold">{plan.name}</h3>
                      {isCurrent && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 min-h-[32px]" style={{ color: "var(--color-text-muted)" }}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-b py-3" style={{ borderColor: "var(--color-border)" }}>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black">
                        {monthlyPrice === 0 ? "0 BDT" : `${monthlyPrice} BDT`}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold">/ month</span>
                    </div>
                    {billingCycle === "yearly" && monthlyPrice > 0 && (
                      <div className="text-[11px] font-semibold text-emerald-500 mt-0.5">
                        Billed annually ({monthlyPrice * 12} BDT / year)
                      </div>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 pt-1">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                      Included Capabilities
                    </span>
                    <ul className="space-y-2 text-xs font-medium">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Plan Select CTA Button */}
                <button
                  disabled={isCurrent}
                  onClick={() => handleOpenUpgradeModal(planKey)}
                  className={`w-full py-3 px-4 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-700"
                      : isPopular
                      ? "bg-primary text-white hover:opacity-90 shadow-md"
                      : "border border-gray-300 dark:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {isCurrent ? (
                    "Active Plan"
                  ) : (
                    <>
                      Upgrade to {plan.name} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 space-y-6 shadow-2xl overflow-hidden"
            style={{
              background: "var(--color-card-bg)",
              borderColor: "var(--color-card-border)",
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <h3 className="text-lg font-extrabold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Confirm Subscription Upgrade
                </h3>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Review your selected plan details and payment option below.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Plan Summary Box */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center justify-between font-extrabold">
                <span className="text-base text-primary">{SUBSCRIPTION_PLANS[selectedPlan].name}</span>
                <span className="text-lg">
                  {SUBSCRIPTION_PLANS[selectedPlan].priceBDT === 0
                    ? "0 BDT"
                    : `${
                        billingCycle === "yearly"
                          ? Math.round(SUBSCRIPTION_PLANS[selectedPlan].priceBDT * 0.85) * 12
                          : SUBSCRIPTION_PLANS[selectedPlan].priceBDT
                      } BDT`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Billing Cycle:</span>
                <span className="font-bold capitalize">{billingCycle} Billed</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Capacity Unlocked:</span>
                <span className="font-bold">
                  {SUBSCRIPTION_PLANS[selectedPlan].maxStudents >= 999999
                    ? "Unlimited Students & Batches"
                    : `Up to ${SUBSCRIPTION_PLANS[selectedPlan].maxStudents} Students`}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-400">Payment Gateway Option</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bkash")}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "bkash"
                      ? "border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400"
                      : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <span className="text-base font-extrabold">bKash</span>
                  <span>Mobile Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("nagad")}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "nagad"
                      ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <span className="text-base font-extrabold">Nagad</span>
                  <span>Mobile Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "card"
                      ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <span className="text-base font-extrabold">Card</span>
                  <span>Visa/Master</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: "var(--color-border)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmUpgrade}
                className="px-5 py-2.5 text-sm font-extrabold rounded-xl bg-primary text-white hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Complete & Activate Plan <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
