"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getParentDashboard, getLinkedStudent } from "@/actions/parentActions";
import { useLanguage } from "@/context/LanguageContext";
import {
  CalendarCheck,
  CreditCard,
  Award,
  FileText,
  Loader2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Bell,
  GraduationCap,
  Megaphone,
} from "lucide-react";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string; labelBn: string }> = {
  paid:    { bg: "var(--color-success-bg, #f0fdf4)", color: "var(--color-success, #16a34a)", label: "Paid",    labelBn: "পরিশোধিত" },
  unpaid:  { bg: "var(--color-error-bg, #fef2f2)",   color: "var(--color-error, #dc2626)",   label: "Unpaid",  labelBn: "বকেয়া" },
  partial: { bg: "var(--color-warning-bg, #fffbeb)", color: "var(--color-warning, #d97706)", label: "Partial", labelBn: "আংশিক" },
};

const SUBMISSION_STYLES: Record<string, { bg: string; color: string; label: string; labelBn: string }> = {
  pending:   { bg: "var(--color-warning-bg, #fffbeb)", color: "var(--color-warning, #d97706)", label: "Pending",   labelBn: "বাকি" },
  submitted: { bg: "var(--color-primary-50)",           color: "var(--color-primary)",           label: "Submitted", labelBn: "জমা দেওয়া" },
  graded:    { bg: "var(--color-success-bg, #f0fdf4)", color: "var(--color-success, #16a34a)", label: "Graded",    labelBn: "গ্রেডকৃত" },
  late:      { bg: "var(--color-error-bg, #fef2f2)",   color: "var(--color-error, #dc2626)",   label: "Late",      labelBn: "দেরিতে" },
};

const ATTENDANCE_STYLES: Record<string, { icon: typeof CheckCircle2; color: string; label: string; labelBn: string }> = {
  present: { icon: CheckCircle2, color: "var(--color-success, #16a34a)", label: "Present", labelBn: "উপস্থিত" },
  absent:  { icon: XCircle,      color: "var(--color-error, #dc2626)",   label: "Absent",  labelBn: "অনুপস্থিত" },
  late:    { icon: Clock,        color: "var(--color-warning, #d97706)", label: "Late",    labelBn: "দেরিতে" },
};

// ── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl animate-shimmer ${className}`}
      style={{ minHeight: "80px", border: "1px solid var(--color-border)" }}
    />
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({
  icon: Icon,
  message,
  linkHref,
  linkLabel,
  iconColor = "var(--color-text-muted)",
  iconBg = "var(--color-bg-tertiary)",
}: {
  icon: typeof FileText;
  message: string;
  linkHref?: string;
  linkLabel?: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 px-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <Icon className="w-6 h-6" style={{ color: iconColor }} />
      </div>
      <p className="text-sm text-center font-medium" style={{ color: "var(--color-text-muted)" }}>
        {message}
      </p>
      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{ color: "var(--color-primary)" }}
        >
          {linkLabel} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ── Attendance progress ring ─────────────────────────────────────────────────
function AttendanceRing({ pct }: { pct: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (pct / 100) * circumference;
  const color = pct >= 75 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#f87171";

  return (
    <svg width="72" height="72" className="shrink-0 -rotate-90" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={radius} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${strokeDash} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text
        x="36" y="36" textAnchor="middle" dominantBaseline="central"
        className="rotate-90"
        style={{ fill: "#fff", fontSize: "13px", fontWeight: 800, transform: "rotate(90deg)", transformOrigin: "36px 36px" }}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ParentDashboardPage() {
  const supabase = createClient();
  const { t, language } = useLanguage();
  const isBn = language === "bn";

  const [data, setData] = useState<any>(null);
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const d = await getParentDashboard();
        setData(d);
        // Get child name via existing server action
        try {
          const student = await getLinkedStudent();
          setChildName(student.fullName ?? "");
        } catch {
          setChildName("");
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
        <SkeletonCard className="h-44" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <SkeletonCard className="h-36" />
        <SkeletonCard className="h-52" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
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

  const attendancePct = data?.attendancePct ?? 0;
  const presentClasses = data?.presentClasses ?? 0;
  const totalClasses = data?.totalClasses ?? 0;
  const fee = data?.latestFee;
  const feeStyle = fee ? (STATUS_STYLES[fee.status] ?? STATUS_STYLES.unpaid) : null;
  const pendingCount = data?.pendingAssignments?.length ?? 0;
  const lastExam = data?.upcomingExams?.[0] ?? null;
  const recentNotice = data?.recentNotice ?? null;

  // Recent attendance (up to 4 records)
  const recentAttendance: any[] = data?.recentAttendance ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 60%, #4f46e5 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.12]"
          style={{ background: "#fff", transform: "translate(30%, -40%)" }} />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-[0.08]"
          style={{ background: "#fff", transform: "translate(-40%, 40%)" }} />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Greeting */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.2)" }}>
                <GraduationCap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                {t("nav.parentDashboard")}
              </span>
            </div>

            <h1 className="text-xl font-extrabold text-white leading-snug">
              {t("dashboard.parentWelcome")}{childName ? ` ${childName}` : ""}
            </h1>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              {t("dashboard.parentSubtitle")}
            </p>

            {/* Quick stat chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                <CalendarCheck className="w-3 h-3" />
                {presentClasses} / {totalClasses} {t("common.classes") || "classes"}
              </div>
              {fee && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                  <CreditCard className="w-3 h-3" />
                  {isBn ? feeStyle?.labelBn : feeStyle?.label}
                </div>
              )}
            </div>
          </div>

          {/* Attendance ring */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <AttendanceRing pct={attendancePct} />
            <span className="text-[10px] font-bold text-white/60">
              {t("dashboard.attendanceRate")}
            </span>
          </div>
        </div>
      </div>

      {recentNotice && (
        <div className="bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 shadow-sm relative overflow-hidden flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                {t("dashboard.recentNotice") || "Recent Notice"}
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1">
                {recentNotice.title}
              </div>
            </div>
          </div>
          <Link href="/parent/notifications" className="shrink-0 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors">
             <ChevronRight className="w-4 h-4 text-slate-500" />
          </Link>
        </div>
      )}

      {/* ── 4-Metric Stat Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Attendance */}
        <Link href="/parent/attendance"
          className="rounded-2xl p-4 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.1)" }}>
              <CalendarCheck className="w-4.5 h-4.5" style={{ color: "#10b981" }} />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-text-muted)" }} />
          </div>
          <div>
            <p className="text-xl font-extrabold" style={{ color: "var(--color-text)" }}>
              {attendancePct}%
            </p>
            <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
              {t("dashboard.attendanceRate")}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {presentClasses} {t("dashboard.presentClasses")} / {totalClasses} {t("dashboard.totalClasses")}
            </p>
          </div>
        </Link>

        {/* Fee Status */}
        <Link href="/parent/fees"
          className="rounded-2xl p-4 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.1)" }}>
              <CreditCard className="w-4.5 h-4.5" style={{ color: "#6366f1" }} />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-text-muted)" }} />
          </div>
          <div>
            {fee ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold" style={{ color: "var(--color-text)" }}>
                    ৳{fee.amountPaid}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: feeStyle?.bg, color: feeStyle?.color }}>
                    {isBn ? feeStyle?.labelBn : feeStyle?.label}
                  </span>
                </div>
                <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {t("dashboard.latestFee")}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {MONTH_NAMES[fee.month]} {fee.year} · ৳{fee.amountDue} {t("common.total") || "total"}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-extrabold" style={{ color: "var(--color-text-muted)" }}>—</p>
                <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {t("dashboard.latestFee")}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {t("dashboard.noFeeRecords")}
                </p>
              </>
            )}
          </div>
        </Link>

        {/* Pending Assignments */}
        <Link href="/parent/assignments"
          className="rounded-2xl p-4 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.1)" }}>
              <FileText className="w-4.5 h-4.5" style={{ color: "#f59e0b" }} />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-text-muted)" }} />
          </div>
          <div>
            <div className="text-xl font-extrabold flex items-center h-7" style={{ color: pendingCount > 0 ? "var(--color-warning, #d97706)" : "var(--color-text)" }}>
              {pendingCount}
            </div>
            <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
              {t("dashboard.pendingAssignments")}
            </p>
            <p className="text-[10px] mt-0.5 font-bold" style={{ color: pendingCount > 0 ? "var(--color-warning, #d97706)" : "var(--color-success, #16a34a)" }}>
              {pendingCount === 0 ? (t("dashboard.allSubmitted") || "All submitted ✓") : (t("dashboard.actionRequired") || "Action Required")}
            </p>
          </div>
        </Link>

        {/* Upcoming Exam */}
        <Link href="/parent/results"
          className="rounded-2xl p-4 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.1)" }}>
              <Award className="w-4.5 h-4.5" style={{ color: "#8b5cf6" }} />
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-text-muted)" }} />
          </div>
          <div>
            {lastExam ? (
              <>
                <p className="text-sm font-extrabold truncate" style={{ color: "var(--color-text)" }}>
                  {lastExam.title}
                </p>
                <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {t("dashboard.upcomingExams")}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(lastExam.examDate).toLocaleDateString(isBn ? "bn-BD" : "en-US", { month: "short", day: "numeric" })}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-extrabold" style={{ color: "var(--color-text-muted)" }}>—</p>
                <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {t("dashboard.upcomingExams")}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {t("dashboard.noUpcomingExams")}
                </p>
              </>
            )}
          </div>
        </Link>
      </div>

      {/* ── Recent Attendance Timeline ───────────────────────────────────── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.1)" }}>
              <CalendarCheck className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              {t("dashboard.recentAttendance")}
            </span>
          </div>
          <Link href="/parent/attendance"
            className="text-xs font-semibold flex items-center gap-0.5 transition-opacity hover:opacity-70"
            style={{ color: "var(--color-primary)" }}>
            {t("dashboard.viewAll")} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {recentAttendance.length > 0 ? (
          <div className="space-y-2">
            {recentAttendance.slice(0, 4).map((rec: any, i: number) => {
              const style = ATTENDANCE_STYLES[rec.status] ?? ATTENDANCE_STYLES.absent;
              const Icon = style.icon;
              return (
                <div key={rec.id ?? i}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: "var(--color-bg-secondary)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${style.color}18` }}>
                    <Icon className="w-4 h-4" style={{ color: style.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
                      {rec.batchName ?? (t("common.class") || "Class")}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(rec.date).toLocaleDateString(isBn ? "bn-BD" : "en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${style.color}18`, color: style.color }}>
                    {isBn ? style.labelBn : style.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={CalendarCheck}
            message={t("dashboard.noAttendanceRecords")}
            linkHref="/parent/attendance"
            linkLabel={t("dashboard.viewAll")}
            iconColor="#10b981"
            iconBg="rgba(16,185,129,0.08)"
          />
        )}
      </div>

      {/* ── Recent Assignments ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.1)" }}>
              <FileText className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              {t("dashboard.recentAssignments")}
            </span>
          </div>
          <Link href="/parent/assignments"
            className="text-xs font-semibold flex items-center gap-0.5 transition-opacity hover:opacity-70"
            style={{ color: "var(--color-primary)" }}>
            {t("dashboard.viewAll")} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {data?.pendingAssignments?.length > 0 ? (
          <div className="space-y-2">
            {data.pendingAssignments.slice(0, 3).map((a: any) => {
              const s = SUBMISSION_STYLES[a.status] ?? SUBMISSION_STYLES.pending;
              return (
                <div key={a.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "var(--color-bg-secondary)" }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
                      {a.title}
                    </p>
                    {a.deadline && (
                      <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                        {t("common.due") || "Due:"}{" "}
                        {new Date(a.deadline).toLocaleDateString(isBn ? "bn-BD" : "en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ml-2"
                    style={{ background: s.bg, color: s.color }}>
                    {isBn ? s.labelBn : s.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            message={t("dashboard.noPendingAssignments")}
            iconColor="#f59e0b"
            iconBg="rgba(245,158,11,0.08)"
          />
        )}
      </div>

      {/* ── Quick Access 4-Card Grid ─────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--color-text-muted)" }}>
          {t("dashboard.quickAccess")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              href: "/parent/attendance",
              icon: CalendarCheck,
              label: t("dashboard.fullAttendance"),
              desc: t("dashboard.fullAttendanceDesc"),
              iconColor: "#10b981",
              iconBg: "rgba(16,185,129,0.1)",
            },
            {
              href: "/parent/fees",
              icon: CreditCard,
              label: t("dashboard.feeHistory"),
              desc: t("dashboard.feeHistoryDesc"),
              iconColor: "#6366f1",
              iconBg: "rgba(99,102,241,0.1)",
            },
            {
              href: "/parent/results",
              icon: Award,
              label: t("dashboard.examResults"),
              desc: t("dashboard.examResultsDesc"),
              iconColor: "#8b5cf6",
              iconBg: "rgba(139,92,246,0.1)",
            },
            {
              href: "/parent/assignments",
              icon: FileText,
              label: t("dashboard.allAssignments"),
              desc: t("dashboard.allAssignmentsDesc"),
              iconColor: "#f59e0b",
              iconBg: "rgba(245,158,11,0.1)",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: item.iconBg }}
                >
                  <Icon className="w-5 h-5" style={{ color: item.iconColor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: "var(--color-text)" }}>
                    {item.label}
                  </p>
                  <p className="text-[10px] leading-snug" style={{ color: "var(--color-text-muted)" }}>
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
