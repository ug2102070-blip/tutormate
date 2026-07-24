"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { CalendarCheck, CreditCard, HelpCircle, ArrowRight } from "lucide-react";

export default function StudentDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-700 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hello, {user?.displayName || "Student"} 🎓
          </h1>
          <p className="mt-1.5 text-white/90 text-sm max-w-xl leading-relaxed">
            Welcome to your student portal. Track your class attendance, monthly fee history, and ask questions to your teacher.
          </p>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/student/attendance"
          className="p-5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-indigo-500 group shadow-xs"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">
                My Attendance
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">
                View your class attendance logs
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/fees"
          className="p-5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-emerald-500 group shadow-xs"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">
                Payment History
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">
                Check your monthly fee statuses
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/doubts"
          className="p-5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-amber-500 group shadow-xs"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-500">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">
                Ask Your Teacher
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">
                Ask doubts with image attachments
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
