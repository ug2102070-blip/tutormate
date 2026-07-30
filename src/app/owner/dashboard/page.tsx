"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  Crown,
} from "lucide-react";
import { getOwnerDashboardStats, type OwnerDashboardStats } from "@/actions/ownerActions";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  href?: string;
}) {
  const content = (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02] cursor-default"
      style={{
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        {href && (
          <ArrowRight className="w-3.5 h-3.5 opacity-40" style={{ color: "var(--color-text-muted)" }} />
        )}
      </div>
      <div>
        <div className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          {value}
        </div>
        <div className="text-xs font-medium mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </div>
        {sub && (
          <div className="text-[10px] mt-1 font-medium" style={{ color }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function MiniBarChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-1.5 h-20 w-full">
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div key={d.month} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${Math.max(pct, 4)}%`,
                background: isLast
                  ? "rgb(245,158,11)"
                  : "rgba(245,158,11,0.3)",
              }}
              title={`৳${d.revenue.toLocaleString()}`}
            />
            <span
              className="text-[9px] font-semibold truncate w-full text-center"
              style={{ color: "var(--color-text-muted)" }}
            >
              {d.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState<OwnerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getOwnerDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message ?? "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyCode = () => {
    if (!stats) return;
    navigator.clipboard.writeText(stats.centerCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 rounded-2xl" style={{ background: "var(--color-border)" }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl" style={{ background: "var(--color-border)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div
        className="rounded-2xl p-6 flex items-center gap-3"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-500">No Coaching Center Found</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            {error ?? "Please create a coaching center first from the Tutor portal."}
          </p>
          <Link
            href="/tutor/coaching"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(239,68,68,0.12)", color: "rgb(239,68,68)" }}
          >
            <Building2 className="w-3.5 h-3.5" />
            Create Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div
        className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.08) 100%)",
          border: "1px solid rgba(245,158,11,0.25)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(245,158,11,0.15)" }}
          >
            <Crown className="w-6 h-6" style={{ color: "rgb(245,158,11)" }} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
              {stats.centerName}
            </h1>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Center Owner Dashboard
            </p>
          </div>
        </div>

        {/* Join Code */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer group"
          style={{
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onClick={copyCode}
        >
          <QrCode className="w-4 h-4" style={{ color: "rgb(245,158,11)" }} />
          <span className="font-mono text-sm font-bold" style={{ color: "var(--color-text)" }}>
            {stats.centerCode}
          </span>
          {codeCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: "var(--color-text-muted)" }} />
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total Tutors"
          value={stats.totalTutors}
          color="rgb(245,158,11)"
          href="/owner/tutors"
        />
        <StatCard
          icon={GraduationCap}
          label="Active Students"
          value={stats.totalStudents}
          color="rgb(16,185,129)"
          href="/owner/students"
        />
        <StatCard
          icon={BookOpen}
          label="Active Batches"
          value={stats.totalBatches}
          color="var(--color-primary)"
          href="/owner/batches"
        />
        <StatCard
          icon={CalendarCheck}
          label="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          sub={stats.attendanceRate >= 80 ? "Good performance" : "Needs attention"}
          color={stats.attendanceRate >= 80 ? "rgb(16,185,129)" : "rgb(245,158,11)"}
          href="/owner/attendance"
        />
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          icon={CreditCard}
          label="Monthly Revenue Collected"
          value={`৳${stats.monthlyRevenue.toLocaleString()}`}
          color="rgb(16,185,129)"
          href="/owner/fees"
        />
        <StatCard
          icon={TrendingUp}
          label="Pending Fees This Month"
          value={`৳${stats.pendingFees.toLocaleString()}`}
          sub={stats.pendingFees > 0 ? "Needs collection" : "All collected!"}
          color={stats.pendingFees > 0 ? "rgb(239,68,68)" : "rgb(16,185,129)"}
          href="/owner/fees"
        />
      </div>

      {/* Revenue Trend + Recent Tutors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue trend */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Revenue Trend (6 Months)
            </h2>
            <Link
              href="/owner/fees"
              className="text-[11px] font-semibold flex items-center gap-1"
              style={{ color: "rgb(245,158,11)" }}
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <MiniBarChart data={stats.monthlyRevenueTrend} />
        </div>

        {/* Recent Tutors */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Your Tutors
            </h2>
            <Link
              href="/owner/tutors"
              className="text-[11px] font-semibold flex items-center gap-1"
              style={{ color: "rgb(245,158,11)" }}
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.recentTutors.length === 0 ? (
            <div className="text-xs text-center py-6" style={{ color: "var(--color-text-muted)" }}>
              No tutors yet. Share your join code!
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentTutors.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "rgba(245,158,11,0.15)", color: "rgb(245,158,11)" }}
                    >
                      {t.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                        {t.fullName}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                        {t.batchCount} batches · {t.studentCount} students
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        <h2 className="text-sm font-bold mb-4" style={{ color: "var(--color-text)" }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/owner/invite", label: "Share Invite", icon: QrCode, color: "rgb(245,158,11)" },
            { href: "/owner/tutors", label: "Manage Tutors", icon: Users, color: "var(--color-primary)" },
            { href: "/owner/fees", label: "Fee Reports", icon: CreditCard, color: "rgb(16,185,129)" },
            { href: "/tutor/batches", label: "My Batches", icon: BookOpen, color: "rgb(139,92,246)" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all duration-200 hover:scale-105"
              style={{
                background: `${color}10`,
                border: `1px solid ${color}25`,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18` }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              <span className="text-[11px] font-semibold" style={{ color: "var(--color-text)" }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
