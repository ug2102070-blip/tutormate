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
  Crown,
  AlertCircle,
  Sparkles,
  BarChart2,
  PieChart,
} from "lucide-react";
import { getOwnerDashboardStats, type OwnerDashboardStats } from "@/actions/ownerActions";
import { createCoachingCenter } from "@/actions/coachingActions";
import { useLanguage } from "@/context/LanguageContext";

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-1.5 h-24 w-full">
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div key={d.month} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div
              className="w-full rounded-t-lg transition-all duration-700"
              style={{
                height: `${Math.max(pct, 5)}%`,
                background: isLast
                  ? "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)"
                  : "rgba(245,158,11,0.25)",
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

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
  href,
  trend,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  bg: string;
  href?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const content = (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg group"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: bg }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {href && (
          <ArrowRight
            className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity -translate-x-1 group-hover:translate-x-0 duration-200"
            style={{ color: "var(--color-text-muted)" }}
          />
        )}
      </div>
      <div>
        <div
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          {value}
        </div>
        <div
          className="text-xs font-semibold mt-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </div>
        {sub && (
          <div
            className="text-[10px] mt-1.5 font-bold px-2 py-0.5 rounded-full inline-block"
            style={{
              color,
              background: bg,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OwnerDashboardPage() {
  const { t, language } = useLanguage();
  const isBn = language === "bn";
  const [stats, setStats] = useState<OwnerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const [centerNameInput, setCenterNameInput] = useState("");
  const [centerAddressInput, setCenterAddressInput] = useState("");
  const [centerPhoneInput, setCenterPhoneInput] = useState("");
  const [creatingCenter, setCreatingCenter] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOwnerDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCreateCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerNameInput.trim()) return;
    setCreatingCenter(true);
    setCreateErr(null);
    try {
      const formData = new FormData();
      formData.set("name", centerNameInput.trim());
      if (centerAddressInput.trim()) formData.set("address", centerAddressInput.trim());
      if (centerPhoneInput.trim()) formData.set("contactPhone", centerPhoneInput.trim());
      await createCoachingCenter(formData);
      await fetchStats();
    } catch (err: any) {
      setCreateErr(err.message || "Failed to create coaching center.");
    } finally {
      setCreatingCenter(false);
    }
  };

  const copyCode = () => {
    if (!stats) return;
    navigator.clipboard.writeText(stats.centerCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-28 rounded-2xl" style={{ background: "var(--color-border)" }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl" style={{ background: "var(--color-border)" }} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl" style={{ background: "var(--color-border)" }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Create center form ───────────────────────────────────────────────────
  if (error || !stats) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <div
          className="rounded-3xl p-6 sm:p-8 space-y-6"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(245,158,11,0.15)" }}
            >
              <Building2 className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                {t("owner.createCenterTitle")}
              </h2>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {t("owner.createCenterDesc")}
              </p>
            </div>
          </div>

          {createErr && (
            <div className="p-3 text-xs rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              {createErr}
            </div>
          )}

          <form onSubmit={handleCreateCenterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>
                {t("owner.centerNameLabel")} *
              </label>
              <input
                type="text"
                required
                value={centerNameInput}
                onChange={(e) => setCenterNameInput(e.target.value)}
                placeholder={t("owner.centerNamePlaceholder")}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-amber-500/30"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>
                  {t("owner.contactPhoneLabel")}
                </label>
                <input
                  type="tel"
                  value={centerPhoneInput}
                  onChange={(e) => setCenterPhoneInput(e.target.value)}
                  placeholder="01712345678"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-amber-500/30"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>
                  {t("owner.addressLabel")}
                </label>
                <input
                  type="text"
                  value={centerAddressInput}
                  onChange={(e) => setCenterAddressInput(e.target.value)}
                  placeholder={t("owner.addressPlaceholder")}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-amber-500/30"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingCenter || !centerNameInput.trim()}
              className="w-full py-3 text-xs font-extrabold text-white rounded-xl transition-all shadow-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: "linear-gradient(135deg, rgb(245,158,11) 0%, rgb(217,119,6) 100%)" }}
            >
              <Building2 className="w-4 h-4" />
              {creatingCenter ? t("owner.initializingCenter") : t("owner.createCenterBtn")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main dashboard ───────────────────────────────────────────────────────
  const totalRevenue = stats.monthlyRevenueTrend.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">

      {/* ── Welcome Banner ── */}
      <div
        className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 40%, #b45309 100%)",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
          style={{ background: "rgba(255,255,255,0.3)" }}
        />
        <div
          className="absolute -bottom-10 right-20 w-28 h-28 rounded-full opacity-10"
          style={{ background: "rgba(255,255,255,0.4)" }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-md">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-0.5">
                {t("owner.dashboardSubtitle")}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {stats.centerName}
              </h1>
            </div>
          </div>

          {/* Join Code pill */}
          <button
            onClick={copyCode}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all group shrink-0 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-white/80" />
            <span className="font-mono text-sm font-extrabold text-white tracking-wider">
              {stats.centerCode}
            </span>
            {codeCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* ── Section label ── */}
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {t("dashboard.overviewMetrics")}
      </p>

      {/* ── 4 Key Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 -mt-2">
        <StatCard
          icon={Users}
          label={t("owner.totalTutors")}
          value={stats.totalTutors}
          color="#f59e0b"
          bg="rgba(245,158,11,0.12)"
          href="/owner/tutors"
        />
        <StatCard
          icon={GraduationCap}
          label={t("owner.activeStudents")}
          value={stats.totalStudents}
          color="#10b981"
          bg="rgba(16,185,129,0.12)"
          href="/owner/students"
        />
        <StatCard
          icon={BookOpen}
          label={t("owner.activeBatches")}
          value={stats.totalBatches}
          color="#6366f1"
          bg="rgba(99,102,241,0.12)"
          href="/owner/batches"
        />
        <StatCard
          icon={CalendarCheck}
          label={t("owner.attendanceRate")}
          value={`${stats.attendanceRate}%`}
          sub={
            stats.attendanceRate >= 80
              ? t("owner.goodPerformance")
              : t("owner.needsAttention")
          }
          color={stats.attendanceRate >= 80 ? "#10b981" : "#f59e0b"}
          bg={stats.attendanceRate >= 80 ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)"}
          href="/owner/attendance"
        />
      </div>

      {/* ── Revenue Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          icon={CreditCard}
          label={t("owner.monthlyRevenueCollected")}
          value={`৳${stats.monthlyRevenue.toLocaleString()}`}
          color="#10b981"
          bg="rgba(16,185,129,0.12)"
          href="/owner/fees"
        />
        <StatCard
          icon={AlertCircle}
          label={t("owner.pendingFeesThisMonth")}
          value={`৳${stats.pendingFees.toLocaleString()}`}
          sub={
            stats.pendingFees > 0
              ? t("owner.needsCollection")
              : t("owner.allCollected")
          }
          color={stats.pendingFees > 0 ? "#ef4444" : "#10b981"}
          bg={stats.pendingFees > 0 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)"}
          href="/owner/fees"
        />
      </div>

      {/* ── Revenue Chart + Tutor List ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <BarChart2 className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                {t("owner.revenueTrend")}
              </h2>
            </div>
            <Link
              href="/owner/fees"
              className="text-[11px] font-bold flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: "rgb(245,158,11)" }}
            >
              {t("common.viewAll")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Total revenue summary */}
          <p className="text-[11px] mb-4 ml-9" style={{ color: "var(--color-text-muted)" }}>
            {isBn ? `৬ মাসে মোট: ৳${totalRevenue.toLocaleString()}` : `6-month total: ৳${totalRevenue.toLocaleString()}`}
          </p>

          <MiniBarChart data={stats.monthlyRevenueTrend} />
        </div>

        {/* Recent Tutors */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                {t("owner.yourTutors")}
              </h2>
            </div>
            <Link
              href="/owner/tutors"
              className="text-[11px] font-bold flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: "rgb(245,158,11)" }}
            >
              {t("common.manage")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {stats.recentTutors.length === 0 ? (
            <div
              className="text-xs text-center py-8 flex flex-col items-center gap-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <span>{t("owner.noTutorsYet")}</span>
              <Link
                href="/owner/invite"
                className="mt-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white"
                style={{ background: "rgb(245,158,11)" }}
              >
                {t("owner.shareInvite")}
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {stats.recentTutors.map((tutor, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-2 rounded-xl transition-colors hover:bg-amber-500/5"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                      style={{
                        background: `hsl(${(i * 47 + 30) % 360}, 70%, 88%)`,
                        color: `hsl(${(i * 47 + 30) % 360}, 60%, 35%)`,
                      }}
                    >
                      {tutor.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                        {tutor.fullName}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                        {isBn
                          ? `${tutor.batchCount} টি ব্যাচ · ${tutor.studentCount} জন শিক্ষার্থী`
                          : `${tutor.batchCount} batch${tutor.batchCount !== 1 ? "es" : ""} · ${tutor.studentCount} student${tutor.studentCount !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      color: "rgb(16,185,129)",
                    }}
                  >
                    {t("owner.activeNow")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
          {t("owner.quickActions")}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              href: "/owner/invite",
              label: t("owner.shareInvite"),
              icon: QrCode,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.1)",
            },
            {
              href: "/owner/tutors",
              label: t("owner.manageTutors"),
              icon: Users,
              color: "#6366f1",
              bg: "rgba(99,102,241,0.1)",
            },
            {
              href: "/owner/fees",
              label: t("owner.feeReports"),
              icon: PieChart,
              color: "#10b981",
              bg: "rgba(16,185,129,0.1)",
            },
            {
              href: "/tutor/batches",
              label: t("owner.myBatches"),
              icon: BookOpen,
              color: "#8b5cf6",
              bg: "rgba(139,92,246,0.1)",
            },
          ].map(({ href, label, icon: Icon, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl text-center transition-all duration-200 hover:scale-[1.03] hover:shadow-md"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: bg }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span
                className="text-[11px] font-bold leading-tight"
                style={{ color: "var(--color-text)" }}
              >
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Insights Strip ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
          {t("owner.insights")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            className="p-4 rounded-xl flex items-start gap-3"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                {t("owner.attendanceHealth")}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {stats.attendanceRate >= 80
                  ? isBn ? "চমৎকার! ৮০%-এর উপরে — শিক্ষার্থীরা সক্রিয়।" : "Great! Above 80% — students are engaged."
                  : stats.attendanceRate >= 60
                  ? isBn ? "গড় উপস্থিতি। অনুপস্থিত শিক্ষার্থীদের সাথে যোগাযোগ করুন।" : "Average. Follow up with absent students."
                  : isBn ? "কম উপস্থিতি। রিমাইন্ডার পাঠানোর কথা বিবেচনা করুন।" : "Low attendance. Consider sending reminders."}
              </p>
            </div>
          </div>

          <div
            className="p-4 rounded-xl flex items-start gap-3"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                {t("owner.feeCollection")}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {stats.pendingFees > 0
                  ? isBn
                    ? `৳${stats.pendingFees.toLocaleString()} বকেয়া আছে — SMS রিমাইন্ডার পাঠান।`
                    : `৳${stats.pendingFees.toLocaleString()} pending — send reminders now.`
                  : isBn ? "সব ফি আদায় হয়েছে! চমৎকার।" : "All fees collected! Great work."}
              </p>
            </div>
          </div>

          <div
            className="p-4 rounded-xl flex items-start gap-3"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                {isBn ? "সেন্টার সামারি" : "Center Summary"}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {isBn
                  ? `${stats.totalTutors} জন শিক্ষক, ${stats.totalBatches} টি ব্যাচে ${stats.totalStudents} জন শিক্ষার্থী পরিচালনা করছেন।`
                  : `${stats.totalTutors} tutor${stats.totalTutors !== 1 ? "s" : ""} managing ${stats.totalStudents} student${stats.totalStudents !== 1 ? "s" : ""} across ${stats.totalBatches} batch${stats.totalBatches !== 1 ? "es" : ""}.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
