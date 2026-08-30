import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudentProgressReport } from "@/actions/studentReportActions";
import { StudentReportAISection } from "@/components/tutor/StudentReportAISection";
import {
  ArrowLeft,
  Printer,
  UserCircle,
  CalendarCheck,
  CreditCard,
  FileText,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

// ─── Bar Chart (CSS-only, no library) ─────────────────────────────────────────
function ProgressBar({
  value,
  color = "#6366f1",
  label,
}: {
  value: number;
  color?: string;
  label?: string;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold">
          <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
          <span style={{ color: "var(--color-text)" }}>{value}%</span>
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 8, background: "var(--color-border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="p-4 rounded-xl border space-y-1"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className="text-xl font-extrabold" style={{ color: accent || "var(--color-text)" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Section({
  title,
  icon: Icon,
  children,
  accent,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="rounded-2xl border p-6 space-y-4 print:break-inside-avoid"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: accent ? `${accent}18` : "var(--color-bg-secondary)", color: accent || "var(--color-text-muted)" }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ─── Trend indicator ──────────────────────────────────────────────────────────
function Trend({ value }: { value: number | null }) {
  if (value === null) return <Minus className="w-4 h-4 text-slate-400" />;
  if (value >= 75) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (value >= 50) return <Minus className="w-4 h-4 text-amber-500" />;
  return <TrendingDown className="w-4 h-4 text-rose-500" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function StudentReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = await getStudentProgressReport(id);

  if (!report) notFound();

  const { student, attendance, fees, assignments, exams, batchNames } = report;

  const fmtBDT = (n: number) =>
    new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 })
      .format(n)
      .replace("BDT", "৳");

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Toolbar */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/tutor/students"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Students
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          <Printer className="w-3.5 h-3.5" />
          Print Report
        </button>
      </div>

      {/* Student Header */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <UserCircle className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
              {student.fullName}
            </h1>
            <p className="text-sm font-medium mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {student.phone}
              {student.institution ? ` · ${student.institution}` : ""}
            </p>
            {batchNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {batchNames.map((b) => (
                  <span
                    key={b}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400 font-medium">Enrolled</p>
            <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
              {fmtDate(student.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick overview row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Attendance"
          value={`${attendance.attendanceRate}%`}
          sub={`${attendance.presentDays}/${attendance.totalDays} days`}
          accent={attendance.attendanceRate >= 75 ? "#10b981" : attendance.attendanceRate >= 50 ? "#f59e0b" : "#ef4444"}
        />
        <MetricCard
          label="Fee Status"
          value={fmtBDT(fees.outstanding)}
          sub="Outstanding"
          accent={fees.outstanding === 0 ? "#10b981" : "#ef4444"}
        />
        <MetricCard
          label="Exam Avg"
          value={exams.averagePercentage !== null ? `${exams.averagePercentage}%` : "—"}
          sub={`${exams.appeared} exam${exams.appeared !== 1 ? "s" : ""}`}
          accent={exams.averagePercentage !== null && exams.averagePercentage >= 60 ? "#6366f1" : "#f59e0b"}
        />
        <MetricCard
          label="Last 30 Days"
          value={`${attendance.last30DaysRate}%`}
          sub="Recent attendance"
          accent="#6366f1"
        />
      </div>

      {/* AI Performance Evaluation & Parent Note */}
      <StudentReportAISection studentId={student.id} studentName={student.fullName} />

      {/* Attendance Section */}
      <Section title="Attendance" icon={CalendarCheck} accent="#10b981">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Present", value: attendance.presentDays, color: "#10b981" },
            { label: "Absent", value: attendance.absentDays, color: "#ef4444" },
            { label: "Late", value: attendance.lateDays, color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: `${color}10` }}>
              <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3 mt-2">
          <ProgressBar value={attendance.attendanceRate} color="#10b981" label="Overall attendance rate" />
          <ProgressBar value={attendance.last30DaysRate} color="#6366f1" label="Last 30 days" />
        </div>
      </Section>

      {/* Fees Section */}
      <Section title="Fee History" icon={CreditCard} accent="#3b82f6">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Total Invoiced" value={fmtBDT(fees.totalDue)} />
          <MetricCard label="Collected" value={fmtBDT(fees.totalPaid)} accent="#10b981" />
          <MetricCard label="Outstanding" value={fmtBDT(fees.outstanding)} accent={fees.outstanding > 0 ? "#ef4444" : "#10b981"} />
        </div>
        <div className="flex items-center justify-between text-xs pt-2 font-medium" style={{ color: "var(--color-text-muted)" }}>
          <span>Paid months: <strong style={{ color: "var(--color-text)" }}>{fees.paidCount}</strong> · Unpaid: <strong style={{ color: "var(--color-text)" }}>{fees.unpaidCount}</strong></span>
          {fees.lastPaidAt && <span>Last payment: {fmtDate(fees.lastPaidAt)}</span>}
        </div>
        {fees.totalDue > 0 && (
          <ProgressBar
            value={Math.round((fees.totalPaid / fees.totalDue) * 100)}
            color="#3b82f6"
            label="Collection rate"
          />
        )}
      </Section>

      {/* Assignments Section */}
      <Section title="Assignments" icon={FileText} accent="#f59e0b">
        {assignments.total === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--color-text-muted)" }}>
            No assignments in enrolled batches yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Total Assigned" value={String(assignments.total)} />
            <MetricCard label="Submitted" value={String(assignments.submitted)} accent="#f59e0b" />
          </div>
        )}
      </Section>

      {/* Exams Section */}
      <Section title="Exam Performance" icon={Award} accent="#8b5cf6">
        {exams.total === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--color-text-muted)" }}>
            No exam results recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="Exams Appeared" value={String(exams.appeared)} />
              <MetricCard label="Average" value={exams.averagePercentage !== null ? `${exams.averagePercentage}%` : "—"} accent="#8b5cf6" />
              <MetricCard label="Top Score" value={exams.topScore !== null ? `${exams.topScore}%` : "—"} accent="#10b981" />
            </div>
            {exams.averagePercentage !== null && (
              <ProgressBar value={exams.averagePercentage} color="#8b5cf6" label="Average exam score" />
            )}
          </div>
        )}
      </Section>

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-slate-400 pt-6 border-t border-slate-200">
        Generated by TutorMate · {new Date().toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}
