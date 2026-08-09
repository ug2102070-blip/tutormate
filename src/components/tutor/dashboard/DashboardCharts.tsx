"use client";

import { LazyBarChart, LazyLineChart, LazyDonutChart } from "@/components/charts/LazyCharts";
import { TrendingUp, CalendarCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import type {
  MonthlyIncomeData,
  FeeDistributionData,
  AttendanceTrendData,
  GradeDistributionData,
  DashboardMetrics,
} from "@/actions/analyticsActions";

interface DashboardChartsProps {
  incomeData: MonthlyIncomeData[];
  feeDist: FeeDistributionData[];
  attendTrend: AttendanceTrendData[];
  gradeDist: GradeDistributionData[];
  metrics: DashboardMetrics;
}

export function DashboardCharts({
  incomeData,
  feeDist,
  attendTrend,
  gradeDist,
  metrics,
}: DashboardChartsProps) {
  const feeDonutData = feeDist.map((item) => ({
    label:
      item.status === "paid"
        ? "Paid"
        : item.status === "partial"
        ? "Partial"
        : "Unpaid",
    value: item.count,
    color:
      item.status === "paid"
        ? "#10b981"
        : item.status === "partial"
        ? "#f59e0b"
        : "#ef4444",
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
          <LazyBarChart
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

        <LazyDonutChart
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

        <LazyLineChart
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

        <LazyDonutChart
          data={gradeDonutData}
          size={140}
          centerText={`${gradeDist.reduce((acc, curr) => acc + curr.count, 0)}`}
          centerSubtext="Grades"
        />
      </div>
    </div>
  );
}
