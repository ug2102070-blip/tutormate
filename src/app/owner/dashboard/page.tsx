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

  const gradientCards = [
    {
      title: t("owner.activeStudents"),
      subtitle: isBn ? "সেন্টারে ভর্তি আছে" : "Enrolled in center",
      value: stats.totalStudents,
      gradient: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
      icon: GraduationCap,
      href: "/owner/students",
      shadow: "0 10px 25px -5px rgba(37, 99, 235, 0.35)",
    },
    {
      title: t("owner.activeBatches"),
      subtitle: isBn ? "চলমান ব্যাচ" : "Running batches",
      value: stats.totalBatches,
      gradient: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
      icon: BookOpen,
      href: "/owner/batches",
      shadow: "0 10px 25px -5px rgba(124, 58, 237, 0.35)",
    },
    {
      title: t("owner.monthlyRevenueCollected"),
      subtitle: isBn ? "এই মাসের আয়" : "This month's earnings",
      value: `৳${stats.monthlyRevenue.toLocaleString()}`,
      gradient: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
      icon: CreditCard,
      href: "/owner/fees",
      shadow: "0 10px 25px -5px rgba(8, 145, 178, 0.35)",
    },
    {
      title: t("owner.attendanceRate"),
      subtitle: isBn ? "গড় উপস্থিতি" : "Average presence",
      value: `${stats.attendanceRate}%`,
      gradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
      icon: CalendarCheck,
      href: "/owner/attendance",
      shadow: "0 10px 25px -5px rgba(5, 150, 105, 0.35)",
    },
    {
      title: t("owner.pendingFeesThisMonth"),
      subtitle: isBn ? "মনোযোগ প্রয়োজন" : "Requires attention",
      value: `৳${stats.pendingFees.toLocaleString()}`,
      gradient: "linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)",
      icon: AlertCircle,
      href: "/owner/fees",
      shadow: "0 10px 25px -5px rgba(234, 88, 12, 0.35)",
    },
    {
      title: t("owner.totalTutors"),
      subtitle: isBn ? "সেন্টারের শিক্ষক" : "Center tutors",
      value: stats.totalTutors,
      gradient: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)",
      icon: Users,
      href: "/owner/tutors",
      shadow: "0 10px 25px -5px rgba(225, 29, 72, 0.35)",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── Welcome Banner ── */}
      <div
        className="rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 40%, #b45309 100%)",
          boxShadow: "0 15px 35px -5px rgba(245, 158, 11, 0.4)",
        }}
      >
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20 blur-2xl"
          style={{ background: "rgba(255,255,255,0.5)" }}
        />
        <div
          className="absolute -bottom-16 right-32 w-36 h-36 rounded-full opacity-10 blur-xl"
          style={{ background: "rgba(255,255,255,0.6)" }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-lg border border-white/20">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-[11px] font-black uppercase tracking-widest mb-1">
                {t("owner.dashboardSubtitle")}
              </p>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {stats.centerName}
              </h1>
            </div>
          </div>

          <button
            onClick={copyCode}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all group shrink-0 cursor-pointer border border-white/10 shadow-lg"
          >
            <QrCode className="w-4 h-4 text-white/90" />
            <span className="font-mono text-sm sm:text-base font-black text-white tracking-widest">
              {stats.centerCode}
            </span>
            {codeCopied ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : (
              <Copy className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* ── 6 Vibrant Gradient KPI Cards ── */}
      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {gradientCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link
              key={i}
              href={card.href}
              className="relative p-4 sm:p-5 rounded-2xl text-white overflow-hidden transition-all duration-200 hover:-translate-y-1 active:scale-95 group block shrink-0 w-[45vw] min-w-[160px] max-w-[200px] sm:w-auto sm:min-w-0 sm:max-w-none snap-start"
              style={{
                background: card.gradient,
                boxShadow: card.shadow,
              }}
            >
              <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[11px] sm:text-xs font-semibold text-white/90 truncate max-w-[100px]">
                  {card.title}
                </span>
                <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="relative z-10">
                <div className="text-xl sm:text-2xl font-black tracking-tight truncate">
                  {card.value}
                </div>
                <div className="text-[10px] text-white/80 font-medium mt-1 truncate">
                  {card.subtitle}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Revenue Chart + Tutor List ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Revenue Trend */}
        <div
          className="lg:col-span-7 p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center border border-amber-100 dark:border-amber-900/60 shrink-0">
                  <BarChart2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
                  {t("owner.revenueTrend")}
                </h2>
              </div>
              <Link
                href="/owner/fees"
                className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-1"
              >
                {t("common.viewAll")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Total revenue summary */}
            <p className="text-[11px] mt-3 mb-4 font-semibold text-slate-500 dark:text-slate-400">
              {isBn ? `৬ মাসে মোট: ৳${totalRevenue.toLocaleString()}` : `6-month total: ৳${totalRevenue.toLocaleString()}`}
            </p>
          </div>

          <div className="mt-auto">
            <MiniBarChart data={stats.monthlyRevenueTrend} />
          </div>
        </div>

        {/* Recent Tutors */}
        <div
          className="lg:col-span-5 p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                  <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
                  {t("owner.yourTutors")}
                </h2>
              </div>
              <Link
                href="/owner/tutors"
                className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                {t("common.manage")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {stats.recentTutors.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {t("owner.noTutorsYet")}
                  </p>
                </div>
                <Link
                  href="/owner/invite"
                  className="mt-1 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:scale-105 transition-transform"
                  style={{ background: "rgb(245,158,11)" }}
                >
                  {t("owner.shareInvite")}
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 mt-3">
                {stats.recentTutors.map((tutor, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm"
                        style={{
                          background: `hsl(${(i * 47 + 30) % 360}, 70%, 88%)`,
                          color: `hsl(${(i * 47 + 30) % 360}, 60%, 35%)`,
                        }}
                      >
                        {tutor.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate">
                          {tutor.fullName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {isBn
                            ? `${tutor.batchCount} টি ব্যাচ · ${tutor.studentCount} জন শিক্ষার্থী`
                            : `${tutor.batchCount} batch${tutor.batchCount !== 1 ? "es" : ""} · ${tutor.studentCount} student${tutor.studentCount !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-[9px] font-black px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 shrink-0 border border-emerald-200 dark:border-emerald-800/60"
                    >
                      {t("owner.activeNow")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions & Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Insights Strip */}
        <div className="lg:col-span-7 space-y-3 flex flex-col">
          <div className="flex items-center gap-2 mb-1 pl-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
              {t("owner.insights")}
            </h2>
          </div>
          
          <div
            className="p-3.5 rounded-2xl flex items-start gap-3 border bg-slate-50/50 dark:bg-slate-900/40 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all flex-1"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800/60">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {t("owner.attendanceHealth")}
              </p>
              <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">
                {stats.attendanceRate >= 80
                  ? isBn ? "চমৎকার! ৮০%-এর উপরে — শিক্ষার্থীরা সক্রিয়।" : "Great! Above 80% — students are engaged."
                  : stats.attendanceRate >= 60
                  ? isBn ? "গড় উপস্থিতি। অনুপস্থিত শিক্ষার্থীদের সাথে যোগাযোগ করুন।" : "Average. Follow up with absent students."
                  : isBn ? "কম উপস্থিতি। রিমাইন্ডার পাঠানোর কথা বিবেচনা করুন।" : "Low attendance. Consider sending reminders."}
              </p>
            </div>
          </div>

          <div
            className="p-3.5 rounded-2xl flex items-start gap-3 border bg-slate-50/50 dark:bg-slate-900/40 hover:border-amber-300 dark:hover:border-amber-700/60 transition-all flex-1"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800/60">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {t("owner.feeCollection")}
              </p>
              <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">
                {stats.pendingFees > 0
                  ? isBn
                    ? `৳${stats.pendingFees.toLocaleString()} বকেয়া আছে — SMS রিমাইন্ডার পাঠান।`
                    : `৳${stats.pendingFees.toLocaleString()} pending — send reminders now.`
                  : isBn ? "সব ফি আদায় হয়েছে! চমৎকার।" : "All fees collected! Great work."}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-5 space-y-3 flex flex-col">
          <div className="flex items-center gap-2 mb-1 pl-1">
            <QrCode className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
              {t("owner.quickActions")}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3 flex-1">
            {[
              {
                href: "/owner/invite",
                label: t("owner.shareInvite"),
                icon: QrCode,
                gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              },
              {
                href: "/owner/tutors",
                label: t("owner.manageTutors"),
                icon: Users,
                gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              },
              {
                href: "/owner/fees",
                label: t("owner.feeReports"),
                icon: PieChart,
                gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              },
              {
                href: "/owner/batches",
                label: t("owner.myBatches"),
                icon: BookOpen,
                gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              },
            ].map(({ href, label, icon: Icon, gradient }) => (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl text-center overflow-hidden group transition-all hover:scale-[1.03] active:scale-95 shadow-sm border border-slate-200 dark:border-slate-800"
                style={{ background: "var(--color-surface)" }}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" 
                  style={{ background: gradient }} 
                />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md relative z-10 transition-transform group-hover:-translate-y-1"
                  style={{ background: gradient }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span
                  className="text-xs font-bold leading-tight relative z-10"
                  style={{ color: "var(--color-text)" }}
                >
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
