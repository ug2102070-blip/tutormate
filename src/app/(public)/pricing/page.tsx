import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, X, Zap, Building2, Rocket } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — Affordable Plans for Every Tutor",
  description: "Choose the TutorMate plan that fits your teaching business. Free trial available. Plans starting from 299 BDT/month.",
};

const PLANS = [
  {
    name: "Free Trial",
    price: "0",
    period: "30 days",
    tagline: "Try everything free",
    icon: Zap,
    color: "var(--color-text-secondary)",
    gradient: "from-gray-400 to-gray-600",
    features: [
      { text: "Up to 20 students", included: true },
      { text: "2 batches", included: true },
      { text: "Attendance & fees", included: true },
      { text: "Doubt chat", included: true },
      { text: "Study materials", included: true },
      { text: "AI Assistant", included: false },
      { text: "Analytics dashboard", included: false },
      { text: "Parent portal", included: false },
    ],
    cta: "Start Free Trial",
    href: "/register",
    highlight: false,
  },
  {
    name: "Starter",
    price: "299",
    period: "per month",
    tagline: "For growing tutors",
    icon: Rocket,
    color: "#6366f1",
    gradient: "from-indigo-500 to-purple-600",
    features: [
      { text: "Up to 100 students", included: true },
      { text: "10 batches", included: true },
      { text: "All core features", included: true },
      { text: "Assignments & exams", included: true },
      { text: "Calendar & notifications", included: true },
      { text: "Basic AI Assistant", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Parent portal", included: false },
    ],
    cta: "Get Starter",
    href: "/register",
    highlight: true,
  },
  {
    name: "Pro",
    price: "699",
    period: "per month",
    tagline: "For coaching centers",
    icon: Building2,
    color: "#f59e0b",
    gradient: "from-amber-500 to-orange-600",
    features: [
      { text: "Unlimited students", included: true },
      { text: "Unlimited batches", included: true },
      { text: "All Starter features", included: true },
      { text: "Full AI Assistant", included: true },
      { text: "Parent portal", included: true },
      { text: "Multi-tutor / coaching center", included: true },
      { text: "Role permissions engine", included: true },
      { text: "bKash / Nagad payments", included: true },
    ],
    cta: "Get Pro",
    href: "/register",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="py-16 px-6 lg:px-16 max-w-6xl mx-auto">
      <div className="text-center mb-14 space-y-3">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: "var(--color-primary-50)", color: "var(--color-primary)", border: "1px solid var(--color-primary-100)" }}
        >
          💰 Simple Pricing
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          Plans for every tutor
        </h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
          Start free, scale as you grow. No hidden fees. Cancel anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.name}
              className="relative rounded-2xl p-6 flex flex-col transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: "var(--color-surface)",
                border: plan.highlight ? `2px solid var(--color-primary)` : "1px solid var(--color-border)",
                boxShadow: plan.highlight ? "0 0 0 4px var(--color-primary-50)" : undefined,
              }}
            >
              {plan.highlight && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white rounded-full"
                  style={{ background: "var(--color-primary)" }}
                >
                  Most Popular
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${plan.color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: plan.color }} />
                  </div>
                  <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>{plan.name}</h2>
                </div>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{plan.tagline}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-extrabold" style={{ color: "var(--color-text)" }}>৳{plan.price}</span>
                <span className="text-sm ml-1.5" style={{ color: "var(--color-text-muted)" }}>/ {plan.period}</span>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f.text} className="flex items-center gap-2.5 text-sm">
                    {f.included
                      ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--color-success, #22c55e)" }} />
                      : <X className="w-4 h-4 shrink-0 opacity-30" style={{ color: "var(--color-text-muted)" }} />
                    }
                    <span style={{ color: f.included ? "var(--color-text)" : "var(--color-text-muted)", opacity: f.included ? 1 : 0.5 }}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className="block text-center py-2.5 text-sm font-bold rounded-xl transition-all hover:opacity-90"
                style={plan.highlight
                  ? { background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))", color: "white" }
                  : { background: "var(--color-bg-secondary)", color: "var(--color-text)", border: "1px solid var(--color-border)" }
                }
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>

      {/* FAQ Teaser */}
      <div className="mt-16 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Questions?{" "}
          <Link href="/contact" style={{ color: "var(--color-primary)" }} className="font-semibold hover:underline">
            Contact us
          </Link>
          {" "}— we respond within 24 hours.
        </p>
      </div>
    </div>
  );
}
