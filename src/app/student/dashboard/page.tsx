"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { CalendarCheck, CreditCard, HelpCircle, ArrowRight } from "lucide-react";

export default function StudentDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className="p-6 sm:p-8 rounded-2xl text-white relative overflow-hidden shadow-md"
        style={{
          background:
            "linear-gradient(135deg, var(--color-accent-dark) 0%, var(--color-accent) 50%, var(--color-primary) 100%)",
        }}
      >
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Hello, {user?.displayName || "Student"} 🎓
          </h1>
          <p className="mt-1 text-white/80 text-sm max-w-xl">
            Welcome to your student portal. Track your class attendance, monthly fee history, and ask questions to your teacher.
          </p>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/student/attendance"
          className="p-5 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-[var(--color-primary)] group"
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: "var(--color-primary-50)" }}
            >
              <CalendarCheck className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <div className="text-base font-bold text-[var(--color-text)]">
                My Attendance
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                View your class attendance logs
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/fees"
          className="p-5 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-[var(--color-success)] group"
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: "rgb(16 185 129 / 0.1)" }}
            >
              <CreditCard className="w-6 h-6 text-[var(--color-success)]" />
            </div>
            <div>
              <div className="text-base font-bold text-[var(--color-text)]">
                Payment History
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Check your monthly fee statuses
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-success)] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/doubts"
          className="p-5 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] flex items-center justify-between transition-all duration-200 hover:shadow-md hover:border-[var(--color-warning)] group"
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: "rgb(245 158 11 / 0.1)" }}
            >
              <HelpCircle className="w-6 h-6 text-[var(--color-warning)]" />
            </div>
            <div>
              <div className="text-base font-bold text-[var(--color-text)]">
                Ask Your Teacher
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Ask doubts with image attachments
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-warning)] group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
