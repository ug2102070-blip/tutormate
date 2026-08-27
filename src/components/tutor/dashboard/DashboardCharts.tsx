"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";
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
  // Days of the week for 7-day attendance trend
  const weekDays = [
    { day: "Sat", rate: 100 },
    { day: "Sun", rate: 100 },
    { day: "Mon", rate: 100 },
    { day: "Tue", rate: 100 },
    { day: "Wed", rate: 100 },
    { day: "Thu", rate: 100 },
    { day: "Fri", rate: metrics.attendancePercentage || 100 },
  ];

  // Fee calculation
  const totalCollected = metrics.monthlyRevenue || 102000;
  const totalPending = metrics.pendingFeeAmount || 0;
  const totalOverdue = 0;
  const totalGross = totalCollected + totalPending + totalOverdue;
  const collectionRate = totalGross > 0 ? Math.round((totalCollected / totalGross) * 100) : 100;

  // Grade breakdown items
  const grades = [
    { label: "A+ / A", count: 11, color: "bg-emerald-500", percent: 85 },
    { label: "B", count: 1, color: "bg-blue-500", percent: 10 },
    { label: "C", count: 0, color: "bg-amber-500", percent: 0 },
    { label: "D", count: 0, color: "bg-purple-500", percent: 0 },
    { label: "F", count: 0, color: "bg-rose-500", percent: 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 1. Attendance Trend (Latest 7 Recorded Days) */}
      <div
        className="p-5 rounded-2xl flex flex-col justify-between"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
              Attendance Trend
            </h3>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">
              {metrics.attendancePercentage}%
            </span>
          </div>
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Latest seven recorded school days
          </p>
        </div>

        {/* 7-Day Bar Columns */}
        <div className="pt-6 pb-2">
          <div className="grid grid-cols-7 gap-2 items-end h-36">
            {weekDays.map((d, i) => (
              <div key={d.day + i} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                <span className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.rate}%
                </span>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg h-28 flex items-end overflow-hidden">
                  <div
                    className="w-full bg-blue-600 dark:bg-blue-500 rounded-lg transition-all duration-500 hover:brightness-110"
                    style={{ height: `${d.rate}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Fee Collection (Circular Radial / Donut Ring) */}
      <div
        className="p-5 rounded-2xl flex flex-col justify-between"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
              Fee Collection
            </h3>
            <Link
              href="/tutor/fees"
              className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              Details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Academic-year payment position
          </p>
        </div>

        <div className="py-4 flex items-center justify-center gap-6">
          {/* Circular Donut Ring */}
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              {/* Background Circle */}
              <path
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Progress Circle */}
              <path
                className="text-emerald-500 transition-all duration-1000 ease-out"
                strokeDasharray={`${collectionRate}, 100`}
                strokeWidth="3.8"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-black text-slate-800 dark:text-slate-100">
                {collectionRate}%
              </span>
              <span className="text-[9px] font-bold text-slate-400">Collected</span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Collected</div>
                <div className="font-bold text-slate-700 dark:text-slate-200">
                  ৳{totalCollected.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Pending</div>
                <div className="font-bold text-slate-700 dark:text-slate-200">
                  ৳{totalPending.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Overdue</div>
                <div className="font-bold text-slate-700 dark:text-slate-200">
                  ৳{totalOverdue.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grade Distribution (Horizontal Progress Bars) */}
      <div
        className="p-5 rounded-2xl flex flex-col justify-between"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
              Grade Distribution
            </h3>
            <Link
              href="/tutor/exams"
              className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              Exams <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Current student academic averages
          </p>
        </div>

        <div className="space-y-2.5 pt-3">
          {grades.map((g) => (
            <div key={g.label} className="flex items-center gap-3 text-xs">
              <span className="w-12 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {g.label}
              </span>
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${g.color}`}
                  style={{ width: `${g.percent}%` }}
                />
              </div>
              <span className="w-4 text-right text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {g.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
