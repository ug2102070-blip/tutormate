"use client";

import { useAuth } from "@/hooks/useAuth";
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
} from "lucide-react";
import { OnboardingChecklist } from "@/components/tutor/OnboardingChecklist";
import { FeedbackWidget } from "@/components/FeedbackWidget";

export default function TutorDashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      label: "Active Batches",
      value: "0",
      icon: Users,
      color: "#6366f1",
      bg: "rgba(99, 102, 241, 0.1)",
    },
    {
      label: "Total Students",
      value: "0",
      icon: GraduationCap,
      color: "#06b6d4",
      bg: "rgba(6, 182, 212, 0.1)",
    },
    {
      label: "Today's Class",
      value: "0 / 0",
      icon: CalendarCheck,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.1)",
    },
    {
      label: "Pending Doubts",
      value: "0",
      icon: HelpCircle,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.1)",
    },
  ];

  const quickActions = [
    { href: "/tutor/batches", label: "Batches", icon: Users, color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" },
    { href: "/tutor/attendance", label: "Attendance", icon: CalendarCheck, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
    { href: "/tutor/assignments", label: "Assignments", icon: FileText, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
    { href: "/tutor/exams", label: "Exams", icon: Award, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
    { href: "/tutor/materials", label: "Materials", icon: BookOpen, color: "#06b6d4", bg: "rgba(6, 182, 212, 0.1)" },
    { href: "/tutor/doubts", label: "Doubts", icon: HelpCircle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
  ];

  const tutorName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Tutor";

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Welcome Banner */}
      <div
        className="p-5 sm:p-7 rounded-2xl text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #06b6d4 100%)",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20"
          style={{ background: "rgba(255,255,255,0.3)" }}
        />
        <div
          className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full opacity-10"
          style={{ background: "rgba(255,255,255,0.5)" }}
        />

        <div className="relative z-10">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
            Welcome back
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {tutorName} 👋
          </h1>
          <p className="mt-1 text-white/80 text-xs sm:text-sm max-w-sm leading-relaxed">
            Manage your batches, track attendance and student questions.
          </p>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist tutorName={tutorName} />

      {/* Stats Cards — Horizontal scroll on mobile */}
      <div>
        <h2
          className="text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--color-text-muted)" }}
        >
          Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="p-4 rounded-2xl transition-all duration-200"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="p-2 rounded-xl"
                    style={{ background: stat.bg }}
                  >
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                </div>
                <div
                  className="text-2xl font-extrabold tracking-tight"
                  style={{ color: "var(--color-text)" }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-[11px] font-semibold mt-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Grid */}
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
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-150 active:scale-95"
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Batches Card */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Recent Batches
            </h3>
            <Link
              href="/tutor/batches"
              className="text-xs font-bold flex items-center gap-1"
              style={{ color: "var(--color-primary)" }}
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div
            className="py-10 text-center text-xs rounded-xl border border-dashed"
            style={{
              color: "var(--color-text-muted)",
              borderColor: "var(--color-border)",
              background: "var(--color-bg-secondary)",
            }}
          >
            No batches yet.{" "}
            <Link
              href="/tutor/batches"
              className="font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Create one →
            </Link>
          </div>
        </div>

        {/* Pending Doubts Card */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Pending Doubts
            </h3>
            <Link
              href="/tutor/doubts"
              className="text-xs font-bold flex items-center gap-1"
              style={{ color: "var(--color-primary)" }}
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div
            className="py-10 text-center text-xs rounded-xl border border-dashed"
            style={{
              color: "var(--color-text-muted)",
              borderColor: "var(--color-border)",
              background: "var(--color-bg-secondary)",
            }}
          >
            No pending questions right now.
          </div>
        </div>
      </div>

      {/* Floating Pilot Feedback Widget */}
      {user && <FeedbackWidget userId={user.id} userRole="tutor" />}
    </div>
  );
}
