"use client";

import Link from "next/link";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { CalendarCheck, CreditCard, HelpCircle, ArrowRight, BookOpen, AlertCircle, Loader2, Bell } from "lucide-react";
import { getStudentDashboardStats } from "@/actions/dashboardActions";

interface DashboardStats {
  pendingAssignments: number;
  unpaidFeesAmount: number;
  attendanceRate: number | null;
  recentNotice: { title: string; type: string; created_at: string } | null;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data: stats, isLoading: loading } = useSWR<DashboardStats | null>(
    user ? "student-dashboard-stats" : null,
    () => getStudentDashboardStats(),
    { dedupingInterval: 30_000 }
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-5 sm:p-6 rounded-xl text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-700 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t("dashboard.hello")}, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student"} 🎓
          </h1>
          <p className="mt-1.5 text-white/90 text-sm max-w-xl leading-relaxed">
            {t("dashboard.studentSubtitle")}
          </p>
        </div>
      </div>

      {/* Live Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/student/attendance"
          prefetch={true}
          className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div className="font-medium text-slate-600 dark:text-slate-400 text-sm">{t("dashboard.attendanceRate") || "Attendance Rate"}</div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : (
              stats?.attendanceRate !== null && stats?.attendanceRate !== undefined ? `${stats.attendanceRate}%` : 'N/A'
            )}
            {!loading && stats?.attendanceRate !== null && stats?.attendanceRate !== undefined && <span className="text-[10px] font-normal text-slate-500 uppercase tracking-wider">{t("dashboard.last30Days") || "last 30 days"}</span>}
          </div>
        </Link>

        <Link
          href="/student/assignments"
          prefetch={true}
          className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-orange-400 hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2.5">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="font-medium text-slate-600 dark:text-slate-400 text-sm">{t("dashboard.pendingAssignments") || "Pending Assignments"}</div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : (
              stats?.pendingAssignments || 0
            )}
            {!loading && <span className="text-[10px] font-normal text-slate-500 uppercase tracking-wider">{t("dashboard.due") || "due"}</span>}
          </div>
        </Link>

        <Link
          href="/student/fees"
          prefetch={true}
          className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-red-400 hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-2.5">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="font-medium text-slate-600 dark:text-slate-400 text-sm">{t("dashboard.unpaidFees") || "Unpaid Fees"}</div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : (
              stats?.unpaidFeesAmount ? `৳ ${stats.unpaidFeesAmount.toLocaleString()}` : t("dashboard.noDues") || 'No dues'
            )}
          </div>
        </Link>

        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600">
                <Bell className="w-4 h-4" />
              </div>
              <div className="font-medium text-slate-600 dark:text-slate-400 text-sm">{t("dashboard.recentNotice") || "Recent Notice"}</div>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : (
              stats?.recentNotice ? stats.recentNotice.title : t("dashboard.noNotices") || 'No new notices'
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 pt-2">{t("dashboard.quickActions") || "Quick Actions"}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/student/attendance"
          prefetch={true}
          className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-indigo-500 group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t("nav.myAttendance")}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {t("dashboard.myAttendanceDesc")}
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/fees"
          prefetch={true}
          className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-emerald-500 group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t("nav.paymentHistory")}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {t("dashboard.paymentHistoryDesc")}
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/doubts"
          prefetch={true}
          className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-amber-500 group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-500">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t("dashboard.askYourTeacher")}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {t("dashboard.askTeacherDesc")}
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
