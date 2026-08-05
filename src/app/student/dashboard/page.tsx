"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  async function loadStats() {
    try {
      const data = await getStudentDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load dashboard stats", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-700 shadow-md relative overflow-hidden">
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
        <Link href="/student/attendance" className="bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="font-medium text-slate-600 dark:text-slate-400 text-sm">Attendance Rate</div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : (
              stats?.attendanceRate !== null ? `${stats?.attendanceRate}%` : 'N/A'
            )}
            {!loading && stats?.attendanceRate !== null && <span className="text-xs font-normal text-slate-500">last 30 days</span>}
          </div>
        </Link>

        <Link href="/student/assignments" className="bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-orange-400 hover:shadow-md transition-all group relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="font-medium text-slate-600 dark:text-slate-400 text-sm">Pending Assignments</div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : (
              stats?.pendingAssignments || 0
            )}
            {!loading && <span className="text-xs font-normal text-slate-500">due</span>}
          </div>
        </Link>

        <Link href="/student/fees" className="bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-red-400 hover:shadow-md transition-all group relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="font-medium text-slate-600 dark:text-slate-400 text-sm">Unpaid Fees</div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : (
              stats?.unpaidFeesAmount ? `৳ ${stats.unpaidFeesAmount.toLocaleString()}` : 'No dues'
            )}
          </div>
        </Link>

        <div className="bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600">
                <Bell className="w-5 h-5" />
              </div>
              <div className="font-medium text-slate-600 dark:text-slate-400 text-sm">Recent Notice</div>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : (
              stats?.recentNotice ? stats.recentNotice.title : 'No new notices'
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 pt-2">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/student/attendance"
          className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-indigo-500 group shadow-xs"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600">
              <CalendarCheck className="w-6 h-6" />
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
          className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-emerald-500 group shadow-xs"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
              <CreditCard className="w-6 h-6" />
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
          className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-amber-500 group shadow-xs"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
              <HelpCircle className="w-6 h-6" />
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
