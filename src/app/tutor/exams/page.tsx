"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  getExams,
  createExam,
  updateExam,
  deleteExam,
  getExamDetails,
  saveExamResults,
} from "@/actions/examActions";
import { computeExamGrade } from "@/lib/gradeUtils";
import { getTutorBatches } from "@/actions/batchActions";
import type { ExamWithStatsDoc } from "@/types";
import { EmptyState } from "@/components/EmptyState";
import {
  Award,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  FileSpreadsheet,
  Check,
  Calendar,
  Users,
  BookOpen,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Percent,
  CheckCircle,
  BarChart2,
  HelpCircle,
  GraduationCap,
} from "lucide-react";

export default function ExamsResultsPage() {
  const { user } = useAuth();
  const { selectedYear } = useAcademicYear();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"examinations" | "grading">("examinations");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamWithStatsDoc | null>(null);
  const [deletingExam, setDeletingExam] = useState<ExamWithStatsDoc | null>(null);
  const [markingExam, setMarkingExam] = useState<ExamWithStatsDoc | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // 1. Fetch Batches
  const { data: batches = [] } = useSWR(
    user ? "tutor-batches" : null,
    () => getTutorBatches(),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  // 2. Fetch Exams with Stats
  const {
    data: examResponse,
    isLoading,
    mutate: mutateExams,
  } = useSWR(
    user ? ["tutor-exams", batchFilter] : null,
    () => getExams(batchFilter === "all" ? null : batchFilter),
    { revalidateOnFocus: true, dedupingInterval: 10_000 }
  );

  const exams: ExamWithStatsDoc[] = examResponse?.exams || [];

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchesBatch = batchFilter === "all" || e.batchId === batchFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.subject && e.subject.toLowerCase().includes(q)) ||
        (e.batchName && e.batchName.toLowerCase().includes(q));
      return matchesBatch && matchesSearch;
    });
  }, [exams, batchFilter, searchQuery]);

  // High-level aggregate metrics
  const totalExamsCount = exams.length;
  const totalMarkedSubmissions = exams.reduce((acc, e) => acc + (e.markedCount || 0), 0);
  const totalPassCount = exams.reduce((acc, e) => acc + (e.passCount || 0), 0);

  const avgScoreNumeric = useMemo(() => {
    const validWithScores = exams.filter((e) => e.averagePercentage);
    if (validWithScores.length === 0) return null;
    const sum = validWithScores.reduce((acc, e) => {
      return acc + parseFloat(e.averagePercentage!.replace("%", ""));
    }, 0);
    return (sum / validWithScores.length).toFixed(1);
  }, [exams]);

  const overallPassRate = useMemo(() => {
    if (totalMarkedSubmissions === 0) return null;
    return Math.round((totalPassCount / totalMarkedSubmissions) * 100);
  }, [totalMarkedSubmissions, totalPassCount]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast message */}
      {statusMsg && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-slide-in text-xs font-bold ${
            statusMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="ml-2 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
            <Link href="/tutor/dashboard" className="hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Exams & Results</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Exams & Results
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Create examinations, enter marks and configure grading rules for {selectedYear?.name || "2026-27"}.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exam</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          className="p-4 rounded-2xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Exams</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-slate-800 dark:text-slate-100">{totalExamsCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across {batches.length} active batches</p>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evaluated</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-slate-800 dark:text-slate-100">{totalMarkedSubmissions}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Marks scored & published</p>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Class Average</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-blue-600">
            {avgScoreNumeric !== null ? `${avgScoreNumeric}%` : "—"}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Overall student score</p>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pass Rate</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-600">
            {overallPassRate !== null ? `${overallPassRate}%` : "—"}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{totalPassCount} passing marks</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab("examinations")}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === "examinations"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          Examinations ({exams.length})
        </button>
        <button
          onClick={() => setActiveTab("grading")}
          className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "grading"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          <span>Grading System</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold">
            GPA 5.0
          </span>
        </button>
      </div>

      {/* 1. EXAMINATIONS VIEW */}
      {activeTab === "examinations" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Batch Filter */}
              <div className="w-full sm:w-64">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Class & Section</label>
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-200 outline-hidden font-bold"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <option value="all">All classes / batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.gradeClass ? `(${b.gradeClass})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="w-full sm:w-60">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Search Exam</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by title, subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-200 outline-hidden font-medium"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right self-end sm:self-center text-xs font-semibold text-slate-400">
              Showing {filteredExams.length} of {exams.length} exams
            </div>
          </div>

          {/* Exams Table */}
          {isLoading ? (
            <div
              className="p-12 text-center rounded-2xl border flex flex-col items-center justify-center gap-3"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading examinations...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center space-y-3"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {searchQuery || batchFilter !== "all" ? "No matching exams found" : "No examinations created yet"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || batchFilter !== "all"
                  ? "Try resetting your filter or searching for another keyword."
                  : "Schedule your first examination to record student marks, calculate automated ranks, and publish report cards."}
              </p>
              {!(searchQuery || batchFilter !== "all") && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md inline-flex items-center gap-1.5 cursor-pointer mt-2"
                >
                  <Plus className="w-4 h-4" /> Add First Exam
                </button>
              )}
            </div>
          ) : (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Exam</th>
                      <th className="px-5 py-3.5">Class / Batch</th>
                      <th className="px-5 py-3.5">Subject</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Total Marks</th>
                      <th className="px-5 py-3.5">Evaluated</th>
                      <th className="px-5 py-3.5">Average</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{exam.title}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(exam.examDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-700 dark:text-slate-300">{exam.batchName}</div>
                          {exam.gradeClass && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              {exam.gradeClass}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {exam.subject || "General"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(exam.examDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">
                          {exam.totalMarks}
                          {exam.passMarks && (
                            <span className="text-[10px] font-normal text-slate-400 block">
                              Pass: {exam.passMarks}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {exam.markedCount}
                            </span>
                            {exam.totalStudents > 0 && (
                              <span className="text-[10px] text-slate-400">/ {exam.totalStudents}</span>
                            )}
                          </div>
                          {exam.totalStudents > 0 && (
                            <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.round((exam.markedCount / exam.totalStudents) * 100))}%`,
                                }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 font-black">
                          {exam.averagePercentage ? (
                            <span
                              className={
                                parseFloat(exam.averagePercentage) >= 80
                                  ? "text-emerald-600"
                                  : parseFloat(exam.averagePercentage) >= 60
                                  ? "text-blue-600"
                                  : parseFloat(exam.averagePercentage) >= 40
                                  ? "text-amber-600"
                                  : "text-rose-600"
                              }
                            >
                              {exam.averagePercentage}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">N/A</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setMarkingExam(exam)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <span>Enter Marks</span>
                            </button>
                            <Link
                              href={`/tutor/exams/${exam.id}`}
                              title="Full Gradebook & Print View"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => setEditingExam(exam)}
                              title="Edit Exam"
                              className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-400 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingExam(exam)}
                              title="Delete Exam"
                              className="p-1.5 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. GRADING SYSTEM TAB */}
      {activeTab === "grading" && (
        <div className="space-y-6">
          <div
            className="p-6 rounded-2xl border space-y-5"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  Institutional Grading Policy (Standard GPA 5.0)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Automated letter grade and GPA threshold calculations used across student report cards and parent portals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  grade: "A+",
                  range: "80% – 100%",
                  gpa: "5.00",
                  remark: "Outstanding",
                  color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                },
                {
                  grade: "A",
                  range: "70% – 79%",
                  gpa: "4.00",
                  remark: "Excellent",
                  color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                },
                {
                  grade: "A-",
                  range: "60% – 69%",
                  gpa: "3.50",
                  remark: "Very Good",
                  color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                },
                {
                  grade: "B",
                  range: "50% – 59%",
                  gpa: "3.00",
                  remark: "Good",
                  color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                },
                {
                  grade: "C",
                  range: "40% – 49%",
                  gpa: "2.00",
                  remark: "Passing",
                  color: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                },
                {
                  grade: "D",
                  range: "33% – 39%",
                  gpa: "1.00",
                  remark: "Marginal",
                  color: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
                },
                {
                  grade: "F",
                  range: "0% – 32%",
                  gpa: "0.00",
                  remark: "Fail / Needs Improvement",
                  color: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
                },
              ].map((g) => (
                <div
                  key={g.grade}
                  className={`p-4 rounded-xl border flex items-center justify-between ${g.color}`}
                >
                  <div>
                    <div className="font-black text-xl leading-none">{g.grade}</div>
                    <div className="text-xs font-semibold opacity-90 mt-1">{g.range}</div>
                    <div className="text-[10px] opacity-75">{g.remark}</div>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-white/70 dark:bg-black/40 shadow-xs">
                    GPA {g.gpa}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Automated Features Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="p-5 rounded-2xl border space-y-2"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                <BarChart2 className="w-4 h-4" />
                <span>Automatic Batch Ranking</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Whenever you save marks, TutorMate automatically calculates position ranks (#1, #2, #3, etc.) for all evaluated students. In case of tied marks, students share the same rank and subsequent ranks adapt automatically.
              </p>
            </div>

            <div
              className="p-5 rounded-2xl border space-y-2"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Instant Student & Parent Feed</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Published examination results are instantly available to students in their portal and to parents in their report card overview, along with tutor remarks and progress indicators.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE EXAM ──────────────────────────────────────────────── */}
      {showAddModal && (
        <CreateExamModal
          batches={batches}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            mutateExams();
            showToast("success", "Examination created successfully!");
          }}
        />
      )}

      {/* ─── MODAL: EDIT EXAM ────────────────────────────────────────────────── */}
      {editingExam && (
        <EditExamModal
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSuccess={() => {
            setEditingExam(null);
            mutateExams();
            showToast("success", "Examination updated successfully!");
          }}
        />
      )}

      {/* ─── MODAL: DELETE EXAM ──────────────────────────────────────────────── */}
      {deletingExam && (
        <DeleteExamModal
          exam={deletingExam}
          onClose={() => setDeletingExam(null)}
          onSuccess={() => {
            setDeletingExam(null);
            mutateExams();
            showToast("success", "Examination and related marks deleted.");
          }}
        />
      )}

      {/* ─── MODAL: FAST ENTER MARKS ────────────────────────────────────────── */}
      {markingExam && (
        <EnterMarksModal
          exam={markingExam}
          onClose={() => setMarkingExam(null)}
          onSuccess={() => {
            setMarkingExam(null);
            mutateExams();
            showToast("success", "Marks and ranks saved successfully!");
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Create Exam Modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateExamModal({
  batches,
  onClose,
  onSuccess,
}: {
  batches: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [batchId, setBatchId] = useState(batches[0]?.id || "");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(batches[0]?.subject || "");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [totalMarks, setTotalMarks] = useState(100);
  const [passMarks, setPassMarks] = useState(40);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBatchChange = (newBatchId: string) => {
    setBatchId(newBatchId);
    const selected = batches.find((b) => b.id === newBatchId);
    if (selected?.subject) {
      setSubject(selected.subject);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) {
      setError("Please select a batch.");
      return;
    }
    if (!title.trim()) {
      setError("Exam title is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createExam({
        batchId,
        title: title.trim(),
        subject: subject.trim() || null,
        examDate,
        totalMarks: Number(totalMarks),
        passMarks: passMarks ? Number(passMarks) : null,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create examination");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border animate-scale-in space-y-4 my-8"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Create Examination</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
              Batch / Class <span className="text-rose-500">*</span>
            </label>
            <select
              value={batchId}
              onChange={(e) => handleBatchChange(e.target.value)}
              required
              className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold outline-hidden"
              style={{ borderColor: "var(--color-border)" }}
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.gradeClass ? `(${b.gradeClass})` : ""} {b.subject ? `— ${b.subject}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Exam Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mid Term Exam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-hidden font-medium"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Subject</label>
              <input
                type="text"
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-hidden font-medium"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
              Exam Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-hidden font-medium"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Total Marks <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold outline-hidden"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Pass Marks</label>
              <input
                type="number"
                min="0"
                max={totalMarks}
                value={passMarks}
                onChange={(e) => setPassMarks(Number(e.target.value))}
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold outline-hidden"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              style={{ borderColor: "var(--color-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Save Examination</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Edit Exam Modal
// ─────────────────────────────────────────────────────────────────────────────

function EditExamModal({
  exam,
  onClose,
  onSuccess,
}: {
  exam: ExamWithStatsDoc;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(exam.title);
  const [subject, setSubject] = useState(exam.subject || "");
  const [examDate, setExamDate] = useState(exam.examDate);
  const [totalMarks, setTotalMarks] = useState(exam.totalMarks);
  const [passMarks, setPassMarks] = useState(exam.passMarks || 40);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Exam title is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await updateExam(exam.id, {
        title: title.trim(),
        subject: subject.trim() || null,
        examDate,
        totalMarks: Number(totalMarks),
        passMarks: passMarks ? Number(passMarks) : null,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update exam");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border animate-scale-in space-y-4 my-8"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-blue-600" />
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Edit Examination</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold mb-1 text-slate-400">Batch / Class</label>
            <input
              type="text"
              disabled
              value={`${exam.batchName} ${exam.gradeClass ? `(${exam.gradeClass})` : ""}`}
              className="w-full p-2.5 border rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 font-semibold cursor-not-allowed"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Exam Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-hidden font-medium"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-hidden font-medium"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Exam Date</label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-hidden font-medium"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Total Marks</label>
              <input
                type="number"
                min="1"
                required
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold outline-hidden"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Pass Marks</label>
              <input
                type="number"
                min="0"
                max={totalMarks}
                value={passMarks}
                onChange={(e) => setPassMarks(Number(e.target.value))}
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold outline-hidden"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              style={{ borderColor: "var(--color-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Delete Exam Modal
// ─────────────────────────────────────────────────────────────────────────────

function DeleteExamModal({
  exam,
  onClose,
  onSuccess,
}: {
  exam: ExamWithStatsDoc;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      await deleteExam(exam.id);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to delete exam");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl border animate-scale-in space-y-4"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-3 text-rose-600">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Delete Examination?</h3>
            <p className="text-xs text-slate-400">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-100">"{exam.title}"</strong>? All associated student marks ({exam.markedCount} evaluated) and ranks will be permanently removed.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ borderColor: "var(--color-border)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>Delete Permanently</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Fast Enter Marks Modal
// ─────────────────────────────────────────────────────────────────────────────

function EnterMarksModal({
  exam,
  onClose,
  onSuccess,
}: {
  exam: ExamWithStatsDoc;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [students, setStudents] = useState<any[]>([]);
  const [marksState, setMarksState] = useState<
    Record<
      string,
      {
        studentId: string;
        marksObtained: string | number;
        isAbsent: boolean;
        remarks: string;
        grade: string | null;
        position: number | null;
      }
    >
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load students and saved results
  React.useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const { students: studs, results: res } = await getExamDetails(exam.id);
        if (!isMounted) return;

        setStudents(studs);

        const initial: Record<string, any> = {};

        // Default empty states
        studs.forEach((s: any) => {
          initial[s.id] = {
            studentId: s.id,
            marksObtained: "",
            isAbsent: false,
            remarks: "",
            grade: null,
            position: null,
          };
        });

        // Fill existing results
        res.forEach((r: any) => {
          initial[r.studentId] = {
            studentId: r.studentId,
            marksObtained: r.marksObtained !== null ? r.marksObtained : "",
            isAbsent: r.isAbsent || false,
            remarks: r.remarks || "",
            grade: r.grade,
            position: r.position,
          };
        });

        setMarksState(initial);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load students roster");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [exam.id]);

  const handleScoreChange = (studentId: string, val: string) => {
    const num = val === "" ? "" : Number(val);
    const grade = num !== "" ? computeExamGrade(Number(num), exam.totalMarks) : null;

    setMarksState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marksObtained: val,
        isAbsent: false,
        grade,
      },
    }));
  };

  const handleAbsentToggle = (studentId: string, isAbsent: boolean) => {
    setMarksState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isAbsent,
        marksObtained: isAbsent ? "" : prev[studentId]?.marksObtained || "",
        grade: isAbsent ? null : prev[studentId]?.grade || null,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setMarksState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleFillAllMax = () => {
    setMarksState((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.id] = {
          ...updated[s.id],
          marksObtained: exam.totalMarks,
          isAbsent: false,
          grade: "A+",
        };
      });
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const resultsToSave = Object.values(marksState).map((item) => ({
        studentId: item.studentId,
        marksObtained: item.isAbsent || item.marksObtained === "" ? null : Number(item.marksObtained),
        isAbsent: item.isAbsent,
        remarks: item.remarks || null,
      }));

      await saveExamResults({
        examId: exam.id,
        results: resultsToSave,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save marks");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl border animate-scale-in space-y-4 my-8"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                Enter Marks: {exam.title}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {exam.batchName} &bull; Max Marks: <strong>{exam.totalMarks}</strong>
              {exam.passMarks && ` \u2022 Pass Marks: ${exam.passMarks}`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center justify-between text-xs pb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleFillAllMax}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300"
            >
              Fill Full Marks ({exam.totalMarks})
            </button>
          </div>
          <Link
            href={`/tutor/exams/${exam.id}`}
            className="text-blue-600 hover:underline flex items-center gap-1 font-bold text-xs"
          >
            <span>Open Full Gradebook & Print</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Student Marks List */}
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-xs font-bold text-slate-400">Loading student roster...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500">No active students enrolled in this batch.</p>
            <p className="text-[11px] text-slate-400 mt-1">Enroll students under Batches & Students first.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 text-xs">
            {students.map((st, i) => {
              const row = marksState[st.id] || {
                marksObtained: "",
                isAbsent: false,
                remarks: "",
                grade: null,
              };

              const currentGrade = row.isAbsent
                ? null
                : row.marksObtained !== ""
                ? computeExamGrade(Number(row.marksObtained), exam.totalMarks)
                : row.grade;

              return (
                <div
                  key={st.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    row.isAbsent
                      ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                      : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{st.full_name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {st.phone || st.institution || `Code: ${st.invite_code || "N/A"}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {/* Absent Toggle */}
                    <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.isAbsent}
                        onChange={(e) => handleAbsentToggle(st.id, e.target.checked)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span>Absent</span>
                    </label>

                    {/* Marks Input */}
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={exam.totalMarks}
                        placeholder="-"
                        disabled={row.isAbsent}
                        value={row.marksObtained}
                        onChange={(e) => handleScoreChange(st.id, e.target.value)}
                        className="w-18 p-1.5 text-center font-bold text-xs border rounded-lg bg-white dark:bg-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 outline-hidden"
                        style={{ borderColor: "var(--color-border)" }}
                      />
                    </div>

                    {/* Grade Preview Badge */}
                    <div className="w-10 text-center">
                      {row.isAbsent ? (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-600">
                          AB
                        </span>
                      ) : currentGrade ? (
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                            currentGrade.includes("A")
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : currentGrade === "F"
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                              : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {currentGrade}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 font-bold">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ borderColor: "var(--color-border)" }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || students.length === 0}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Save All Marks</span>
          </button>
        </div>
      </div>
    </div>
  );
}
