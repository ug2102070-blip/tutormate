"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Users, GraduationCap, CalendarCheck, HelpCircle, ArrowRight } from "lucide-react";
import { OnboardingChecklist } from "@/components/tutor/OnboardingChecklist";
import { FeedbackWidget } from "@/components/FeedbackWidget";

export default function TutorDashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: "Active Batches", value: "0", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Total Students", value: "0", icon: GraduationCap, color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Today's Attendance", value: "0 / 0", icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pending Doubts", value: "0", icon: HelpCircle, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  const tutorName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Tutor";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {tutorName} 👋
          </h1>
          <p className="mt-1.5 text-white/90 text-sm max-w-xl leading-relaxed">
            Here is an overview of your batches, attendance logs, and student questions for today.
          </p>
        </div>
      </div>

      {/* Onboarding Checklist for Pilot Tutors */}
      <OnboardingChecklist tutorName={tutorName} />

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {stat.label}
                </span>
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Batches Card */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Recent Batches
            </h3>
            <Link
              href="/tutor/batches"
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="py-12 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            No batches created yet. Go to <strong className="text-slate-900 font-semibold">Batches</strong> to create your first batch.
          </div>
        </div>

        {/* Pending Doubts Card */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Student Doubts — Pending
            </h3>
            <Link
              href="/tutor/doubts"
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="py-12 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            No pending questions from students right now.
          </div>
        </div>
      </div>

      {/* Floating Pilot Feedback Widget */}
      {user && <FeedbackWidget userId={user.id} userRole="tutor" />}
    </div>
  );
}
