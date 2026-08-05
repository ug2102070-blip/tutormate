"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
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
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { OnboardingChecklist } from "@/components/tutor/OnboardingChecklist";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import {
  getDashboardMetrics,
  getMonthlyIncomeChart,
  getFeeDistribution,
  getAttendanceTrend,
  getGradeDistribution,
  type DashboardMetrics,
  type MonthlyIncomeData,
  type FeeDistributionData,
  type AttendanceTrendData,
  type GradeDistributionData,
} from "@/actions/analyticsActions";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { DonutChart } from "@/components/charts/DonutChart";

export default function TutorDashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeStudents: 0,
    activeBatches: 0,
    monthlyRevenue: 0,
    pendingFeeAmount: 0,
    attendancePercentage: 100,
    pendingDoubts: 0,
    ungradedSubmissions: 0,
  });

  const [incomeData, setIncomeData] = useState<MonthlyIncomeData[]>([]);
  const [feeDist, setFeeDist] = useState<FeeDistributionData[]>([]);
  const [attendTrend, setAttendTrend] = useState<AttendanceTrendData[]>([]);
  const [gradeDist, setGradeDist] = useState<GradeDistributionData[]>([]);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const userId = user?.id;
        const [m, inc, fee, att, grd] = await Promise.all([
          getDashboardMetrics(),
          getMonthlyIncomeChart(6),
          getFeeDistribution(undefined, undefined),
          getAttendanceTrend(undefined),
          getGradeDistribution(),
        ]);

        setMetrics(m);
        setIncomeData(inc);
        setFeeDist(fee);
        setAttendTrend(att);
        setGradeDist(grd);
      } catch (err) {
        console.error("Error loading dashboard analytics:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadAnalytics();
    } else {
      setLoading(false);
    }
  }, [user]);

  const tutorName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Tutor";

  const stats = [
    {
      label: t("dashboard.activeBatches"),
      value: metrics.activeBatches,
      icon: Users,
      color: "#6366f1",
      bg: "rgba(99, 102, 241, 0.1)",
      href: "/tutor/batches",
    },
    {
      label: t("dashboard.activeStudents"),
      value: metrics.activeStudents,
      icon: GraduationCap,
      color: "#06b6d4",
      bg: "rgba(6, 182, 212, 0.1)",
      href: "/tutor/students",
    },
    {
      label: t("dashboard.monthlyRevenue"),
      value: `৳${metrics.monthlyRevenue.toLocaleString()}`,
      icon: CreditCard,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.1)",
      href: "/tutor/fees",
    },
    {
      label: t("dashboard.pendingFees"),
      value: `৳${metrics.pendingFeeAmount.toLocaleString()}`,
      icon: AlertCircle,
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.1)",
      href: "/tutor/fees",
    },
    {
      label: t("dashboard.attendanceRate"),
      value: `${metrics.attendancePercentage}%`,
      icon: CalendarCheck,
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.1)",
      href: "/tutor/attendance",
    },
    {
      label: t("dashboard.pendingDoubts"),
      value: metrics.pendingDoubts,
      icon: HelpCircle,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.1)",
      href: "/tutor/doubts",
    },
  ];

  const quickActions = [
    { href: "/tutor/ai-assistant", label: t("nav.aiAssistant"), icon: Sparkles, color: "#7c3aed", bg: "rgba(124, 58, 237, 0.1)" },
    { href: "/tutor/batches", label: t("nav.batches"), icon: Users, color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" },
    { href: "/tutor/attendance", label: t("nav.attendance"), icon: CalendarCheck, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
    { href: "/tutor/assignments", label: t("nav.assignments"), icon: FileText, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
    { href: "/tutor/exams", label: t("nav.exams"), icon: Award, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
    { href: "/tutor/materials", label: t("nav.materials"), icon: BookOpen, color: "#06b6d4", bg: "rgba(6, 182, 212, 0.1)" },
  ];

  const feeDonutData = feeDist.map((item) => ({
    label: item.status === "paid" ? t("fees.paid") : item.status === "partial" ? t("fees.partial") : t("fees.unpaid"),
    value: item.count,
    color: item.status === "paid" ? "#10b981" : item.status === "partial" ? "#f59e0b" : "#ef4444",
  }));

  const gradeDonutData = gradeDist.map((item) => ({
    label: item.grade,
    value: item.count,
    color:
      item.grade === "A+"
        ? "#10b981"
        : item.grade === "A"
        ? "#06b6d4"
        : item.grade === "B"
        ? "#6366f1"
        : item.grade === "C"
        ? "#f59e0b"
        : item.grade === "D"
        ? "#8b5cf6"
        : "#ef4444",
  }));

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
              {t("dashboard.welcome")}
            </p>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              {tutorName} 👋
            </h1>
            <p className="mt-1 text-white/80 text-xs sm:text-sm max-w-md leading-relaxed">
              {t("dashboard.tutorSubtitle")}
            </p>
          </div>

          <Link
            href="/tutor/ai-assistant"
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md transition-all active:scale-95 shadow-md"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {t("dashboard.launchAi")}
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist tutorName={tutorName} />

      {/* Stats Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            {t("dashboard.overviewMetrics")}
          </h2>
          {loading && (
            <span className="text-[11px] font-semibold text-indigo-500 animate-pulse">
              {t("dashboard.syncingData")}
            </span>
          )}
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
                  className="text-lg sm:text-xl font-extrabold tracking-tight truncate flex items-center h-7"
                  style={{ color: "var(--color-text)" }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  ) : (
                    stat.value
                  )}
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

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Revenue Bar Chart (7 Cols) */}
        <div
          className="lg:col-span-7 p-5 rounded-2xl space-y-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
                Monthly Tuition Income (6 Months)
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              ৳{metrics.monthlyRevenue.toLocaleString()} this mo.
            </span>
          </div>

          {incomeData.length > 0 ? (
            <BarChart
              data={incomeData.map((d) => ({ label: d.monthLabel, value: d.amount }))}
              height={200}
            />
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No fee records logged in the last 6 months.
            </div>
          )}
        </div>

        {/* Fee Status Donut Chart (5 Cols) */}
        <div
          className="lg:col-span-5 p-5 rounded-2xl space-y-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
              Fee Collection Status
            </h3>
            <Link
              href="/tutor/fees"
              className="text-xs font-bold text-indigo-600 flex items-center gap-1"
            >
              Ledger <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <DonutChart
            data={feeDonutData}
            size={140}
            centerText={`${feeDist.reduce((acc, curr) => acc + curr.count, 0)}`}
            centerSubtext="Total Records"
          />
        </div>

        {/* Attendance Rate Trend Line Chart (7 Cols) */}
        <div
          className="lg:col-span-7 p-5 rounded-2xl space-y-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
                Attendance Rate Trend (Last 4 Weeks)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Avg {metrics.attendancePercentage}%
            </span>
          </div>

          <LineChart
            data={attendTrend.map((a) => ({ label: a.weekLabel, value: a.percentage }))}
            height={200}
            strokeColor="#10b981"
            unit="%"
          />
        </div>

        {/* Exam Grade Distribution Donut Chart (5 Cols) */}
        <div
          className="lg:col-span-5 p-5 rounded-2xl space-y-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
              Exam Grade Breakdown
            </h3>
            <Link
              href="/tutor/exams"
              className="text-xs font-bold text-indigo-600 flex items-center gap-1"
            >
              Exams <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <DonutChart
            data={gradeDonutData}
            size={140}
            centerText={`${gradeDist.reduce((acc, curr) => acc + curr.count, 0)}`}
            centerSubtext="Grades"
          />
        </div>
      </div>

      {/* Floating Pilot Feedback Widget */}
      {user && <FeedbackWidget userId={user.id} userRole="tutor" />}
    </div>
  );
}
