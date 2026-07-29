"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  CalendarCheck,
  Plus,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  Settings,
  BarChart3,
  LogOut,
  ShieldCheck,
  UserPlus,
  Search,
} from "lucide-react";
import {
  createCoachingCenter,
  getCoachingCenter,
  joinCoachingCenter,
  leaveCoachingCenter,
  removeTutorFromCenter,
  updateCoachingCenter,
  getCenterTutors,
  getCenterBatches,
  getCenterAnalytics,
} from "@/actions/coachingActions";
import type {
  CoachingCenterDoc,
  CenterTutorDoc,
  CenterAnalyticsDoc,
} from "@/types";

export default function CoachingCenterPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [centerData, setCenterData] = useState<{
    center: CoachingCenterDoc;
    isOwner: boolean;
  } | null>(null);
  const [tutors, setTutors] = useState<CenterTutorDoc[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<CenterAnalyticsDoc | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "tutors" | "batches" | "analytics" | "settings">("overview");

  // Form states
  const [createForm, setCreateForm] = useState({ name: "", address: "", contactPhone: "" });
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [editForm, setEditForm] = useState({ name: "", address: "", contactPhone: "" });

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [batchSearch, setBatchSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getCoachingCenter();
      setCenterData(data);

      if (data) {
        setEditForm({
          name: data.center.name,
          address: data.center.address || "",
          contactPhone: data.center.contactPhone || "",
        });

        const [tList, bList, aData] = await Promise.all([
          getCenterTutors(),
          getCenterBatches(),
          getCenterAnalytics(),
        ]);
        setTutors(tList);
        setBatches(bList);
        setAnalytics(aData);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load Coaching Center data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", createForm.name);
      formData.append("address", createForm.address);
      formData.append("contactPhone", createForm.contactPhone);

      await createCoachingCenter(formData);
      setSuccessMessage("Coaching Center created successfully!");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create coaching center.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("code", joinCodeInput);

      const res = await joinCoachingCenter(formData);
      setSuccessMessage(`Successfully joined ${res.centerName}!`);
      setJoinCodeInput("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to join coaching center.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", editForm.name);
      formData.append("address", editForm.address);
      formData.append("contactPhone", editForm.contactPhone);

      await updateCoachingCenter(formData);
      setSuccessMessage("Coaching Center details updated!");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update center details.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveCenter = async () => {
    if (!confirm("Are you sure you want to leave this Coaching Center?")) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await leaveCoachingCenter();
      setSuccessMessage("You have left the Coaching Center.");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to leave coaching center.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveTutor = async (tutorId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this Coaching Center?`)) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      await removeTutorFromCenter(tutorId);
      setSuccessMessage(`${name} removed from Coaching Center.`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove tutor.");
    } finally {
      setActionLoading(false);
    }
  };

  const copyJoinCode = () => {
    if (!centerData?.center.code) return;
    navigator.clipboard.writeText(centerData.center.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.name.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.subject.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.tutorName.toLowerCase().includes(batchSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
            Loading Coaching Center...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE A: NOT IN A COACHING CENTER YET
  // =========================================================================
  if (!centerData) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl p-8 text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
              <Building2 className="w-4 h-4" /> Multi-Tutor Platform
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {t("coaching.title")}
            </h1>
            <p className="text-indigo-100 text-sm md:text-base leading-relaxed">
              {t("coaching.subtitle")}
            </p>
          </div>
        </div>

        {/* Error / Success Toast Messages */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        {/* 2 Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Create Center */}
          <div
            className="p-6 rounded-3xl space-y-5 border transition-all duration-200 hover:shadow-lg"
            style={{
              background: "var(--color-card-bg)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                  Create Coaching Center
                </h2>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  For Center Owners & Head Tutors
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateCenter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Center Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Coaching Academy"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Address / Location (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Farmgate, Dhaka"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Contact Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 01700000000"
                  value={createForm.contactPhone}
                  onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {actionLoading ? "Creating Center..." : "Create Coaching Center"}
              </button>
            </form>
          </div>

          {/* Card 2: Join Existing Center */}
          <div
            className="p-6 rounded-3xl space-y-5 border transition-all duration-200 hover:shadow-lg flex flex-col justify-between"
            style={{
              background: "var(--color-card-bg)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                    Join Existing Center
                  </h2>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    For Staff Tutors
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Received a center join code from your coaching head? Enter it below to link your tutor account to the center.
              </p>

              <form onSubmit={handleJoinCenter} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                    Center Join Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CC-8A9F2K"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono tracking-wider font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      background: "var(--color-bg-secondary)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm bg-purple-600 hover:bg-purple-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <LinkIcon className="w-4 h-4" />
                  {actionLoading ? "Joining Center..." : "Join Coaching Center"}
                </button>
              </form>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] space-y-1" style={{ color: "var(--color-text-muted)" }}>
              <div className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> What happens when you join?
              </div>
              <p>Your batches will be visible in the coaching center directory, and analytics will contribute to center totals.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE B: JOINED / COACHING CENTER DASHBOARD
  // =========================================================================
  const center = centerData.center;
  const isOwner = centerData.isOwner;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          {successMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" /> Coaching Center
            </span>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isOwner
                  ? "bg-amber-400/30 text-amber-100 border border-amber-400/40"
                  : "bg-blue-400/30 text-blue-100 border border-blue-400/40"
              }`}
            >
              {isOwner ? "👑 Center Owner" : "👨‍🏫 Staff Tutor"}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {center.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-100 font-medium">
            {center.address && <span>📍 {center.address}</span>}
            {center.contactPhone && <span>📞 {center.contactPhone}</span>}
            <span>📅 Established {new Date(center.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Join Code Box */}
        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 space-y-1.5 w-full md:w-auto shrink-0">
          <p className="text-[11px] font-medium text-indigo-100 uppercase tracking-wider">
            Center Join Code
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xl font-mono font-extrabold tracking-widest text-white">
              {center.code}
            </span>
            <button
              onClick={copyJoinCode}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all active:scale-90"
              title="Copy Join Code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-indigo-200">Share this code with staff tutors to join.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        className="flex items-center gap-1 p-1.5 rounded-2xl border overflow-x-auto"
        style={{
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
        }}
      >
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <Building2 className="w-4 h-4" /> Overview
        </button>

        <button
          onClick={() => setActiveTab("tutors")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "tutors"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <Users className="w-4 h-4" /> Staff Tutors ({tutors.length})
        </button>

        <button
          onClick={() => setActiveTab("batches")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "batches"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <BookOpen className="w-4 h-4" /> Center Batches ({batches.length})
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "analytics"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Analytics
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div
              className="p-4 rounded-2xl border space-y-2"
              style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                <span className="text-xs font-semibold text-gray-500">Tutors</span>
                <Users className="w-4 h-4" />
              </div>
              <p className="text-2xl font-extrabold" style={{ color: "var(--color-text-primary)" }}>
                {analytics?.totalTutors || 0}
              </p>
            </div>

            <div
              className="p-4 rounded-2xl border space-y-2"
              style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                <span className="text-xs font-semibold text-gray-500">Students</span>
                <GraduationCap className="w-4 h-4" />
              </div>
              <p className="text-2xl font-extrabold" style={{ color: "var(--color-text-primary)" }}>
                {analytics?.totalStudents || 0}
              </p>
            </div>

            <div
              className="p-4 rounded-2xl border space-y-2"
              style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                <span className="text-xs font-semibold text-gray-500">Batches</span>
                <BookOpen className="w-4 h-4" />
              </div>
              <p className="text-2xl font-extrabold" style={{ color: "var(--color-text-primary)" }}>
                {analytics?.totalBatches || 0}
              </p>
            </div>

            <div
              className="p-4 rounded-2xl border space-y-2"
              style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span className="text-xs font-semibold text-gray-500">This Month</span>
                <CreditCard className="w-4 h-4" />
              </div>
              <p className="text-xl font-extrabold" style={{ color: "var(--color-text-primary)" }}>
                ৳{(analytics?.monthlyRevenue || 0).toLocaleString()}
              </p>
            </div>

            <div
              className="p-4 rounded-2xl border space-y-2 col-span-2 md:col-span-1"
              style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                <span className="text-xs font-semibold text-gray-500">Attendance</span>
                <CalendarCheck className="w-4 h-4" />
              </div>
              <p className="text-2xl font-extrabold" style={{ color: "var(--color-text-primary)" }}>
                {analytics?.attendanceRate || 100}%
              </p>
            </div>
          </div>

          {/* Quick Staff Preview */}
          <div
            className="p-6 rounded-3xl border space-y-4"
            style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                Staff Tutors ({tutors.length})
              </h3>
              <button
                onClick={() => setActiveTab("tutors")}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                View All →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {tutors.slice(0, 3).map((t) => (
                <div
                  key={t.tutorId}
                  className="p-4 rounded-2xl border space-y-2"
                  style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {t.fullName}
                    </span>
                    {t.isOwner && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{t.institution || "Tutor"}</p>
                  <div className="flex items-center gap-3 text-xs font-medium text-gray-500 pt-1">
                    <span>📚 {t.batchCount} Batches</span>
                    <span>🎓 {t.studentCount} Students</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STAFF TUTORS */}
      {/* ========================================================================= */}
      {activeTab === "tutors" && (
        <div
          className="p-6 rounded-3xl border space-y-6"
          style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                Coaching Staff ({tutors.length})
              </h3>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                All tutors attached to {center.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tutors.map((t) => (
              <div
                key={t.tutorId}
                className="p-5 rounded-2xl border flex flex-col justify-between space-y-4"
                style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>
                      {t.fullName}
                    </h4>
                    {t.isOwner ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20">
                        👑 Owner
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-semibold">
                        Staff Tutor
                      </span>
                    )}
                  </div>

                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    🏫 {t.institution || "Independent"}
                  </p>
                  {t.contactPhone && (
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      📞 {t.contactPhone}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center gap-4 text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    <span>📚 {t.batchCount} Batches</span>
                    <span>🎓 {t.studentCount} Students</span>
                  </div>

                  {isOwner && !t.isOwner && (
                    <button
                      onClick={() => handleRemoveTutor(t.tutorId, t.fullName)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CENTER BATCHES */}
      {/* ========================================================================= */}
      {activeTab === "batches" && (
        <div
          className="p-6 rounded-3xl border space-y-6"
          style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                Center Batches ({batches.length})
              </h3>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Active batches across all staff tutors in {center.name}
              </p>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search batches..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBatches.map((b) => (
              <div
                key={b.id}
                className="p-5 rounded-2xl border space-y-3"
                style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600">
                    {b.gradeClass}
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    👨‍🏫 {b.tutorName}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>
                    {b.name}
                  </h4>
                  <p className="text-xs text-gray-500">{b.subject}</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                  <span>🎓 {b.studentCount} Enrolled</span>
                  <span>৳{b.monthlyFee}/mo</span>
                </div>
              </div>
            ))}

            {filteredBatches.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-gray-500">
                No batches found matching your search.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="p-6 rounded-3xl border space-y-4"
              style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
            >
              <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                Monthly Center Revenue
              </h3>
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Total Collected (This Month)
                </span>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  ৳{(analytics?.monthlyRevenue || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div
              className="p-6 rounded-3xl border space-y-4"
              style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
            >
              <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                Center Attendance Performance
              </h3>
              <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <span>Overall Attendance Rate</span>
                  <span>{analytics?.attendanceRate || 100}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${analytics?.attendanceRate || 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div
          className="p-6 rounded-3xl border space-y-6 max-w-2xl mx-auto"
          style={{ background: "var(--color-card-bg)", borderColor: "var(--color-border)" }}
        >
          <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
            Center Settings
          </h3>

          {isOwner ? (
            <form onSubmit={handleUpdateCenter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Center Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Address / Location
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </form>
          ) : (
            <div className="space-y-4 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
              <p className="text-xs text-gray-500">
                You are currently a Staff Tutor in {center.name}. You can leave this coaching center at any time.
              </p>
              <button
                onClick={handleLeaveCenter}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-red-600 bg-red-500/10 hover:bg-red-500/20 transition-all text-sm active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                {actionLoading ? "Leaving Center..." : "Leave Coaching Center"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
