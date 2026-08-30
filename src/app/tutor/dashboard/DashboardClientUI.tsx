"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  HelpCircle,
  FileText,
  Award,
  BookOpen,
  CreditCard,
  AlertCircle,
  Sparkles,
  Clock,
  ArrowRight,
  Plus,
  Pin,
  Check,
  ChevronRight,
  BookMarked,
  FileCheck,
  FolderDown,
  X,
  Megaphone,
  BookOpenCheck,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { OnboardingChecklist } from "@/components/tutor/OnboardingChecklist";
import type {
  DashboardLiveData,
  DashboardScheduleClass,
  DashboardUpcomingExam,
  DashboardActiveAssignment,
  DashboardRecentMaterial,
  DashboardRecentDoubt,
} from "@/actions/analyticsActions";

export interface DashboardClientUIProps {
  tutorName: string;
  metrics: {
    activeBatches: number;
    activeStudents: number;
    monthlyRevenue: number;
    pendingFeeAmount: number;
    attendancePercentage: number;
    pendingDoubts: number;
  };
  /** Real live data fetched from DB — replaces all hardcoded fake arrays */
  liveData: DashboardLiveData;
}

interface PinnedNote {
  id: string;
  text: string;
  isPinned: boolean;
  createdAt: string;
}

export function DashboardClientUI({ tutorName, metrics, liveData }: DashboardClientUIProps) {
  const { t } = useLanguage();
  const [scheduleTab, setScheduleTab] = useState<"today" | "tomorrow">("today");
  const [academicTab, setAcademicTab] = useState<"exams" | "assignments" | "materials">("exams");

  // Pinned Notes from multi-note storage
  const [pinnedNotes, setPinnedNotes] = useState<PinnedNote[]>([]);

  const loadPinnedNotes = () => {
    try {
      const raw = localStorage.getItem("tutormate_dashboard_multi_notes");
      if (raw) {
        const parsed: PinnedNote[] = JSON.parse(raw);
        setPinnedNotes(parsed.filter((n) => n.isPinned));
      } else {
        const legacyNote = localStorage.getItem("tutormate_dashboard_personal_note");
        if (legacyNote && legacyNote.trim()) {
          setPinnedNotes([
            {
              id: "legacy",
              text: legacyNote,
              isPinned: true,
              createdAt: "Today",
            },
          ]);
        } else {
          setPinnedNotes([]);
        }
      }
    } catch {
      setPinnedNotes([]);
    }
  };

  useEffect(() => {
    loadPinnedNotes();

    const handleNoteUpdated = () => {
      loadPinnedNotes();
    };

    window.addEventListener("tutormate_note_updated", handleNoteUpdated);
    return () => {
      window.removeEventListener("tutormate_note_updated", handleNoteUpdated);
    };
  }, []);

  const unpinNote = (id: string) => {
    try {
      const raw = localStorage.getItem("tutormate_dashboard_multi_notes");
      if (raw) {
        const parsed: PinnedNote[] = JSON.parse(raw);
        const updated = parsed.map((n) => (n.id === id ? { ...n, isPinned: false } : n));
        localStorage.setItem("tutormate_dashboard_multi_notes", JSON.stringify(updated));
        window.dispatchEvent(new Event("tutormate_note_updated"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // ── Real data from DB (via server action getDashboardLiveData) ──────────────
  const todayBatches: DashboardScheduleClass[] = liveData.todayBatches;
  const upcomingExams: DashboardUpcomingExam[] = liveData.upcomingExams;
  const activeAssignments: DashboardActiveAssignment[] = liveData.activeAssignments;
  const recentMaterials: DashboardRecentMaterial[] = liveData.recentMaterials;
  const recentDoubts: DashboardRecentDoubt[] = liveData.recentDoubts;

  const gradientCards = [
    {
      title: "Active Students",
      subtitle: "Enrolled in batches",
      value: metrics.activeStudents,
      gradient: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
      icon: GraduationCap,
      href: "/tutor/students",
      shadow: "0 10px 25px -5px rgba(37, 99, 235, 0.35)",
    },
    {
      title: "Active Batches",
      subtitle: "Running classes",
      value: metrics.activeBatches,
      gradient: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
      icon: Users,
      href: "/tutor/batches",
      shadow: "0 10px 25px -5px rgba(124, 58, 237, 0.35)",
    },
    {
      title: "Monthly Revenue",
      subtitle: "This month's earnings",
      value: `৳${metrics.monthlyRevenue.toLocaleString()}`,
      gradient: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
      icon: CreditCard,
      href: "/tutor/fees",
      shadow: "0 10px 25px -5px rgba(8, 145, 178, 0.35)",
    },
    {
      title: "Attendance Rate",
      subtitle: "Average presence",
      value: `${metrics.attendancePercentage}%`,
      gradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
      icon: CalendarCheck,
      href: "/tutor/attendance",
      shadow: "0 10px 25px -5px rgba(5, 150, 105, 0.35)",
    },
    {
      title: "Pending Fees",
      subtitle: "Requires attention",
      value: `৳${metrics.pendingFeeAmount.toLocaleString()}`,
      gradient: "linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)",
      icon: AlertCircle,
      href: "/tutor/fees",
      shadow: "0 10px 25px -5px rgba(234, 88, 12, 0.35)",
    },
    {
      title: "Upcoming Exams",
      subtitle: "Next 14 days",
      value: upcomingExams.length,
      gradient: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)",
      icon: Award,
      href: "/tutor/exams",
      shadow: "0 10px 25px -5px rgba(225, 29, 72, 0.35)",
    },
  ];

  return (
    <>
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            {getGreeting()}, {tutorName}
          </h1>
          <p
            className="text-xs sm:text-sm mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            Here is what is happening across your batches today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/tutor/batches/new"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Batch</span>
          </Link>
          <Link
            href="/tutor/ai-assistant"
            className="px-3.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-200 dark:border-indigo-800 transition-all active:scale-95 hover:bg-indigo-100 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Assistant</span>
          </Link>
        </div>
      </div>

      {/* Pilot Onboarding Guide (Positioned at top for immediate first-time tutor visibility) */}
      <OnboardingChecklist tutorName={tutorName} />

      {/* Pinned Multi-Notes Banner (if any pinned notes exist) */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          {pinnedNotes.map((note) => (
            <div
              key={note.id}
              className="p-3 px-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/60 flex items-center justify-between gap-3 shadow-xs animate-in fade-in"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Pin className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 truncate">
                  <span className="font-extrabold uppercase tracking-wider text-[10px] bg-amber-200/60 dark:bg-amber-900/80 px-1.5 py-0.5 rounded-md mr-1.5">
                    Pinned Note
                  </span>
                  {note.text}
                </p>
              </div>

              <button
                type="button"
                onClick={() => unpinNote(note.id)}
                className="text-amber-700 dark:text-amber-300 hover:bg-amber-200/50 p-1 rounded-lg transition-all shrink-0 cursor-pointer"
                title="Unpin from dashboard"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 6 Vibrant Gradient Hero KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {gradientCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="relative p-4 sm:p-5 rounded-2xl text-white overflow-hidden transition-all duration-200 hover:-translate-y-1 active:scale-95 group block"
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

      {/* Row 1: Class Routine & Sessions (Left 7 cols) + Upcoming Exams & Doubts Quick Box (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Class Routine & Sessions (7 cols) */}
        <div
          className="lg:col-span-7 p-4 sm:p-5 rounded-2xl border transition-all space-y-3 flex flex-col justify-between"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/60 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
                  Class Routine & Sessions
                </h2>
              </div>

              {/* Time Switcher */}
              <div className="flex items-center gap-1.5">
                <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setScheduleTab("today")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      scheduleTab === "today"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Today ({todayBatches.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleTab("tomorrow")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      scheduleTab === "tomorrow"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>
                <Link
                  href="/tutor/timetable"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors p-1"
                  title="Full Timetable"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2.5 mt-3">
              {todayBatches.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <BookOpenCheck className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      No batches scheduled today
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Create a batch with a weekly schedule to see it here.
                    </p>
                  </div>
                  <Link
                    href="/tutor/batches/new"
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    + Create Batch
                  </Link>
                </div>
              ) : (
                todayBatches.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-700/60 transition-all group"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {cls.scheduleDays.length > 0
                            ? cls.scheduleDays.join(", ")
                            : "Flexible schedule"}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate">
                        {cls.batchName}
                      </h3>
                      <div className="text-[10px] text-slate-400">
                        {cls.subject} • {cls.gradeClass} • {cls.studentsCount} students
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href="/tutor/attendance"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all shadow-xs flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Attendance</span>
                      </Link>
                      <Link
                        href={`/tutor/batches`}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 font-bold text-[10px] transition-all"
                      >
                        Batch
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>
              {todayBatches.length === 0
                ? "No batches today"
                : `${todayBatches.length} ${todayBatches.length === 1 ? "batch" : "batches"} scheduled today`}
            </span>
            <Link href="/tutor/batches" className="text-blue-600 font-semibold hover:underline">
              All Batches →
            </Link>
          </div>
        </div>

        {/* Right: Upcoming Exam Highlight + Compact Student Doubts (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Card 1: Upcoming Exam Highlight */}
          <div
            className="p-4 rounded-2xl border transition-all space-y-2.5"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/60 shrink-0">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-extrabold" style={{ color: "var(--color-text)" }}>
                  Next Upcoming Exam
                </h2>
              </div>
              <Link href="/tutor/exams" className="text-[10px] font-bold text-amber-600 hover:underline">
                All Exams →
              </Link>
            </div>

            {upcomingExams.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2 text-center">
                <Award className="w-8 h-8 text-amber-300" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  No exams in the next 14 days
                </p>
                <Link href="/tutor/exams" className="text-[10px] font-bold text-amber-600 hover:underline">
                  + Schedule an Exam
                </Link>
              </div>
            ) : (
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-200/80 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {upcomingExams[0].daysUntil === 0
                      ? "Today"
                      : upcomingExams[0].daysUntil === 1
                      ? "Tomorrow"
                      : `In ${upcomingExams[0].daysUntil} days`}
                  </span>
                  <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">
                    {upcomingExams[0].title}
                  </h3>
                </div>
                <div className="text-[10px] text-slate-400">
                  {upcomingExams[0].batchName} •{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {new Date(upcomingExams[0].examDate).toLocaleDateString("en-BD", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <Link
                href="/tutor/exams"
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition-all shadow-xs shrink-0"
              >
                Marksheet →
              </Link>
            </div>
            )}
          </div>

          {/* Card 2: Compact Student Doubts Box */}

          <div
            className="p-4 rounded-2xl border transition-all space-y-2.5"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/60 shrink-0">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-extrabold" style={{ color: "var(--color-text)" }}>
                  Student Doubts
                </h2>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  2 Pending
                </span>
              </div>
              <Link href="/tutor/doubts" className="text-[10px] font-bold text-purple-600 hover:underline">
                Forum →
              </Link>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-100 truncate">
                    {recentDoubts[0]?.studentName} ({recentDoubts[0]?.batchName})
                  </span>
                  <span className="text-[9px] text-slate-400">{recentDoubts[0]?.timeAgo}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 italic">
                  "{recentDoubts[0]?.title}"
                </p>
              </div>

              <Link
                href="/tutor/doubts"
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition-all shadow-xs shrink-0 flex items-center gap-0.5"
              >
                <span>Reply</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Teaching Resources & Tasks (Full Width & Elevated) */}
      <div
        className="p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Header with 3 Tabs & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/60 shrink-0">
              <BookMarked className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
                Teaching Resources & Tasks
              </h2>
              <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                Upcoming exams, pending assignments, and study materials
              </p>
            </div>
          </div>

          {/* 3 Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setAcademicTab("exams")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                academicTab === "exams"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              🏆 Exams & Tests ({upcomingExams.length})
            </button>
            <button
              type="button"
              onClick={() => setAcademicTab("assignments")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                academicTab === "assignments"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              📝 Assignments ({activeAssignments.length})
            </button>
            <button
              type="button"
              onClick={() => setAcademicTab("materials")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                academicTab === "materials"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              📖 Study Materials ({recentMaterials.length})
            </button>
          </div>
        </div>

        {/* Content for EXAMS */}
        {academicTab === "exams" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingExams.map((ex) => (
              <div
                key={ex.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 hover:border-amber-300 dark:hover:border-amber-700/60 transition-all group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      {ex.daysUntil === 0 ? "Today" : ex.daysUntil === 1 ? "Tomorrow" : `In ${ex.daysUntil}d`}
                    </span>
                    <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate">
                      {ex.title}
                    </h3>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {ex.batchName} • <span className="font-semibold text-slate-600 dark:text-slate-300">{new Date(ex.examDate).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}</span> • Total: {ex.totalMarks} marks
                  </div>
                </div>

                <Link
                  href="/tutor/exams"
                  className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition-all shrink-0"
                >
                  Enter Marks →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Content for ASSIGNMENTS */}
        {academicTab === "assignments" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeAssignments.map((as) => (
              <div
                key={as.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-700/60 transition-all group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate">
                      {as.title}
                    </h3>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {as.batchName} • <span className="font-semibold text-rose-500">{new Date(as.deadline).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  {as.submittedCount}/{as.totalStudents} Submitted
                  </span>
                  <Link
                    href="/tutor/assignments"
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs"
                  >
                    Grade →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content for STUDY MATERIALS */}
        {academicTab === "materials" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentMaterials.map((mat) => (
              <div
                key={mat.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 transition-colors truncate">
                      {mat.title}
                    </h3>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {mat.batchName} • {mat.fileType.toUpperCase()}{mat.fileSize ? ` • ${(mat.fileSize / 1024 / 1024).toFixed(1)} MB` : ""} • <span className="font-semibold text-slate-600 dark:text-slate-300">{new Date(mat.createdAt).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>

                <Link
                  href="/tutor/materials"
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-all shrink-0"
                >
                  View File →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
