"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getParentDashboard } from "@/actions/parentActions";
import {
  CalendarCheck,
  CreditCard,
  Award,
  FileText,
  TrendingUp,
  Loader2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  paid: { bg: "var(--color-success-bg, #f0fdf4)", color: "var(--color-success, #16a34a)", label: "Paid" },
  unpaid: { bg: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #dc2626)", label: "Unpaid" },
  partial: { bg: "var(--color-warning-bg, #fffbeb)", color: "var(--color-warning, #d97706)", label: "Partial" },
};

const SUBMISSION_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "var(--color-warning-bg, #fffbeb)", color: "var(--color-warning, #d97706)", label: "Pending" },
  submitted: { bg: "var(--color-primary-50)", color: "var(--color-primary)", label: "Submitted" },
  graded: { bg: "var(--color-success-bg, #f0fdf4)", color: "var(--color-success, #16a34a)", label: "Graded" },
  late: { bg: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #dc2626)", label: "Late" },
};

export default function ParentDashboardPage() {
  const supabase = createClient();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const d = await getParentDashboard(user.id);
        setData(d);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-error, #dc2626)" }}>
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      </div>
    );
  }

  const fee = data?.latestFee;
  const feeStyle = fee ? (STATUS_STYLES[fee.status] ?? STATUS_STYLES.unpaid) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Welcome Banner */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, var(--color-primary)) 100%)",
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: "#fff", transform: "translate(30%, -30%)" }} />
        <h1 className="text-xl font-extrabold text-white">Parent Dashboard</h1>
        <p className="text-xs text-white/70 mt-0.5">
          Academic overview for your child
        </p>

        {/* Attendance % */}
        <div className="mt-4 flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <span className="text-xl font-black text-white">
              {data?.attendancePct !== null ? `${data.attendancePct}%` : "—"}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-white">Attendance Rate</p>
            <p className="text-[11px] text-white/60">
              {data?.presentClasses ?? 0} present / {data?.totalClasses ?? 0} classes
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Fee Status */}
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            <span className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
              Latest Fee
            </span>
          </div>
          {fee ? (
            <>
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                {MONTH_NAMES[fee.month]} {fee.year}
              </p>
              <span
                className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: feeStyle?.bg, color: feeStyle?.color }}
              >
                {feeStyle?.label}
              </span>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                ৳{fee.amountPaid} / ৳{fee.amountDue}
              </p>
            </>
          ) : (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No fee records</p>
          )}
          <Link href="/parent/fees"
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: "var(--color-primary)" }}>
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Upcoming Exams */}
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            <span className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
              Upcoming Exams
            </span>
          </div>
          {data?.upcomingExams?.length > 0 ? (
            <div className="space-y-1">
              {data.upcomingExams.slice(0, 2).map((e: any) => (
                <div key={e.id}>
                  <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
                    {e.title}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(e.examDate).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No upcoming exams</p>
          )}
          <Link href="/parent/results"
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: "var(--color-primary)" }}>
            View results <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Pending Assignments */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Recent Assignments
            </span>
          </div>
          <Link href="/parent/assignments"
            className="text-xs font-semibold"
            style={{ color: "var(--color-primary)" }}>
            View all
          </Link>
        </div>

        {data?.pendingAssignments?.length > 0 ? (
          <div className="space-y-2">
            {data.pendingAssignments.map((a: any) => {
              const s = SUBMISSION_STYLES[a.status] ?? SUBMISSION_STYLES.pending;
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "var(--color-bg-secondary)" }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
                      {a.title}
                    </p>
                    {a.deadline && (
                      <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                        Due {new Date(a.deadline).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ml-2"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm py-3 text-center" style={{ color: "var(--color-text-muted)" }}>
            No pending assignments 🎉
          </p>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: "/parent/attendance", icon: CalendarCheck, label: "Full Attendance", desc: "View all records" },
          { href: "/parent/results", icon: Award, label: "Exam Results", desc: "Grades & rankings" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-95"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--color-primary-50)" }}
              >
                <Icon className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                  {item.label}
                </p>
                <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  {item.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
