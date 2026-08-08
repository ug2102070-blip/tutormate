// Server Component — no "use client" needed
// Data is fetched on the server before the page is sent to the browser.
// This eliminates skeleton loading and client-side waterfall.

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  HelpCircle,
  ArrowRight,
  FileText,
  Award,
  BookOpen,
  Sparkles,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { OnboardingChecklist } from "@/components/tutor/OnboardingChecklist";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import {
  getDashboardMetrics,
  getMonthlyIncomeChart,
  getFeeDistribution,
  getAttendanceTrend,
  getGradeDistribution,
} from "@/actions/analyticsActions";
import { DashboardCharts } from "@/components/tutor/dashboard/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function TutorDashboardPage() {
  // Get the authenticated user server-side (no client round-trip needed)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all analytics data in parallel on the server
  // React.cache() on verifyUserAuth means auth only runs ONCE across all these calls
  const [metrics, incomeData, feeDist, attendTrend, gradeDist] = await Promise.all([
    getDashboardMetrics(),
    getMonthlyIncomeChart(6),
    getFeeDistribution(undefined, undefined),
    getAttendanceTrend(undefined),
    getGradeDistribution(),
  ]);

  const tutorName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Tutor";

  const stats = [
    {
      label: "Active Batches",
      value: metrics.activeBatches,
      icon: Users,
      color: "#6366f1",
      bg: "rgba(99, 102, 241, 0.1)",
      href: "/tutor/batches",
    },
    {
      label: "Active Students",
      value: metrics.activeStudents,
      icon: GraduationCap,
      color: "#06b6d4",
      bg: "rgba(6, 182, 212, 0.1)",
      href: "/tutor/students",
    },
    {
      label: "Monthly Revenue",
      value: `৳${metrics.monthlyRevenue.toLocaleString()}`,
      icon: CreditCard,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.1)",
      href: "/tutor/fees",
    },
    {
      label: "Pending Fees",
      value: `৳${metrics.pendingFeeAmount.toLocaleString()}`,
      icon: AlertCircle,
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.1)",
      href: "/tutor/fees",
    },
    {
      label: "Attendance Rate",
      value: `${metrics.attendancePercentage}%`,
      icon: CalendarCheck,
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.1)",
      href: "/tutor/attendance",
    },
    {
      label: "Pending Doubts",
      value: metrics.pendingDoubts,
      icon: HelpCircle,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.1)",
      href: "/tutor/doubts",
    },
  ];

  const quickActions = [
    { href: "/tutor/ai-assistant", label: "AI Assistant", icon: Sparkles, color: "#7c3aed", bg: "rgba(124, 58, 237, 0.1)" },
    { href: "/tutor/batches", label: "Batches", icon: Users, color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" },
    { href: "/tutor/attendance", label: "Attendance", icon: CalendarCheck, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
    { href: "/tutor/assignments", label: "Assignments", icon: FileText, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
    { href: "/tutor/exams", label: "Exams", icon: Award, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
    { href: "/tutor/materials", label: "Materials", icon: BookOpen, color: "#06b6d4", bg: "rgba(6, 182, 212, 0.1)" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div
        className="p-6 sm:p-8 rounded-2xl text-white relative overflow-hidden shadow-lg"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #06b6d4 100%)",
        }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
              Welcome Back
            </p>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              {tutorName} 👋
            </h1>
            <p className="mt-1 text-white/80 text-xs sm:text-sm max-w-md leading-relaxed">
              Here&apos;s your tuition overview for today.
            </p>
          </div>

          <Link
            href="/tutor/ai-assistant"
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md transition-all active:scale-95 shadow-md"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Launch AI
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist — still a client component (uses localStorage) */}
      <OnboardingChecklist tutorName={tutorName} />

      {/* Stats Cards Grid — rendered with real data, no skeleton */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Overview Metrics
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="p-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-95 block"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="p-2 rounded-xl"
                    style={{ background: stat.bg }}
                  >
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                </div>
                <div
                  className="text-lg sm:text-xl font-extrabold tracking-tight truncate"
                  style={{ color: "var(--color-text)" }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-[11px] font-semibold mt-0.5 truncate"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {stat.label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div>
        <h2
          className="text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--color-text-muted)" }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-150 active:scale-95 hover:border-indigo-400"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: action.bg }}
                >
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <span
                  className="text-[10px] font-bold text-center"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* AI Assistant Banner */}
      <div
        className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          background: "linear-gradient(90deg, rgba(99, 102, 241, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
              Need teaching materials or parent messages?
            </h3>
            <p className="text-xs text-slate-500">
              Use AI Assistant to create MCQs, assignments, lesson plans, and polite SMS templates in seconds.
            </p>
          </div>
        </div>

        <Link
          href="/tutor/ai-assistant"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all shrink-0 active:scale-95"
        >
          Try AI Generator <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Analytics Charts — client component, receives data as props */}
      <DashboardCharts
        incomeData={incomeData}
        feeDist={feeDist}
        attendTrend={attendTrend}
        gradeDist={gradeDist}
        metrics={metrics}
      />

      {/* Floating Pilot Feedback Widget */}
      <FeedbackWidget userId={user.id} userRole="tutor" />
    </div>
  );
}
