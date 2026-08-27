"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getStudentSubmissions } from "@/actions/assignmentActions";
import {
  BookOpen,
  FileText,
  Loader2,
  ArrowRight,
  Clock,
  CheckCircle,
  FileDown,
  AlertCircle,
  Search,
  Paperclip,
} from "lucide-react";
import type { BatchDoc, SubmissionDoc } from "@/types";
import Link from "next/link";

export default function StudentAssignmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "submitted" | "graded">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get student's enrolled batches
      const { data: studentDoc } = await supabase
        .from("students")
        .select("enrolled_batch_ids")
        .eq("auth_uid", user?.id)
        .single();

      if (studentDoc && studentDoc.enrolled_batch_ids?.length > 0) {
        const { data: batchesData } = await supabase
          .from("batches")
          .select("*")
          .in("id", studentDoc.enrolled_batch_ids);

        if (batchesData) {
          setBatches(
            batchesData.map((b) => ({
              id: b.id,
              tutorId: b.tutor_id,
              name: b.name,
              subject: b.subject,
              gradeClass: b.grade_class,
              monthlyFee: b.monthly_fee,
              schedule: b.schedule,
              studentCount: b.student_count,
              isArchived: b.is_archived,
              createdAt: b.created_at,
            }))
          );
        }
      }

      // 2. Load assignments (submissions for this student)
      const subs = await getStudentSubmissions(selectedBatchId === "all" ? undefined : selectedBatchId);
      setSubmissions(subs);
    } catch (err) {
      console.error("Failed to load assignments data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedBatchId, supabase]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, selectedBatchId, loadData]);

  if (authLoading) return null;

  // Counts
  const totalCount = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const submittedCount = submissions.filter((s) => s.status === "submitted" || s.status === "late").length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      !searchQuery ||
      (sub.assignmentTitle && sub.assignmentTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.batchName && sub.batchName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === "pending") return sub.status === "pending";
    if (activeTab === "submitted") return sub.status === "submitted" || sub.status === "late";
    if (activeTab === "graded") return sub.status === "graded";
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <FileText className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
            {t("assignments.title")}
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {t("assignments.subtitle")}
          </p>
        </div>

        {batches.length > 0 && (
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold outline-none border"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <option value="all">{t("assignments.allAssignments")}</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className="p-3.5 rounded-2xl border flex items-center gap-3"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--color-primary-50)", color: "var(--color-primary)" }}
          >
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              {t("assignments.total")}
            </div>
            <div className="text-lg font-black" style={{ color: "var(--color-text)" }}>
              {totalCount}
            </div>
          </div>
        </div>

        <div
          className="p-3.5 rounded-2xl border flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              {t("assignments.pending")}
            </div>
            <div className="text-lg font-black text-amber-700 dark:text-amber-400">
              {pendingCount}
            </div>
          </div>
        </div>

        <div
          className="p-3.5 rounded-2xl border flex items-center gap-3 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-indigo-600">
            <FileDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              {t("assignments.submitted")}
            </div>
            <div className="text-lg font-black text-indigo-700 dark:text-indigo-400">
              {submittedCount}
            </div>
          </div>
        </div>

        <div
          className="p-3.5 rounded-2xl border flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              {t("assignments.graded")}
            </div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">
              {gradedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div
        className="rounded-3xl border shadow-sm overflow-hidden flex flex-col min-h-[450px]"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Controls Toolbar */}
        <div
          className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg-secondary)",
          }}
        >
          {/* Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: "all", label: `All (${totalCount})` },
              { key: "pending", label: `Pending (${pendingCount})` },
              { key: "submitted", label: `Submitted (${submittedCount})` },
              { key: "graded", label: `Graded (${gradedCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                style={{
                  background: activeTab === tab.key ? "var(--color-surface)" : "transparent",
                  color: activeTab === tab.key ? "var(--color-primary)" : "var(--color-text-muted)",
                  boxShadow: activeTab === tab.key ? "var(--shadow-card)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48" style={{ color: "var(--color-text-muted)" }}>
              <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: "var(--color-primary)" }} />
              <p className="text-xs">{t("assignments.loadingAssignments")}</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: "var(--color-bg-secondary)" }}
              >
                <BookOpen className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                {t("assignments.noAssignments")}
              </h3>
              <p className="text-xs mt-1 max-w-sm" style={{ color: "var(--color-text-muted)" }}>
                You have no assignments under this category. Keep up the great work!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredSubmissions.map((sub) => {
                const isOverdue =
                  sub.status === "pending" && sub.assignmentDeadline && new Date(sub.assignmentDeadline) < new Date();

                return (
                  <div
                    key={sub.id}
                    className="p-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {sub.status === "pending" && !isOverdue && (
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> {t("assignments.pending")}
                          </span>
                        )}
                        {sub.status === "pending" && isOverdue && (
                          <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold border border-red-200 dark:border-red-500/20">
                            <AlertCircle className="w-3 h-3" /> {t("assignments.overdue")}
                          </span>
                        )}
                        {sub.status === "submitted" && (
                          <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-200 dark:border-amber-500/20">
                            <FileDown className="w-3 h-3" /> {t("assignments.submitted")}
                          </span>
                        )}
                        {sub.status === "late" && (
                          <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold border border-red-200 dark:border-red-500/20">
                            <AlertCircle className="w-3 h-3" /> Submitted Late
                          </span>
                        )}
                        {sub.status === "graded" && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" /> {t("assignments.graded")}
                          </span>
                        )}

                        {sub.batchName && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{
                              background: "var(--color-primary-50)",
                              color: "var(--color-primary)",
                            }}
                          >
                            {sub.batchName}
                          </span>
                        )}

                        {sub.assignmentFilePath && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{ color: "var(--color-primary)" }}
                          >
                            <Paperclip className="w-3 h-3" /> Question Sheet Attached
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-sm sm:text-base leading-snug" style={{ color: "var(--color-text)" }}>
                        {sub.assignmentTitle}
                      </h4>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-medium">
                        <span
                          className={`flex items-center ${isOverdue ? "text-red-500 font-bold" : ""}`}
                          style={!isOverdue ? { color: "var(--color-text-muted)" } : undefined}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {t("assignments.dueLabel")}{" "}
                          {sub.assignmentDeadline ? new Date(sub.assignmentDeadline).toLocaleString() : "--"}
                        </span>
                        <span style={{ color: "var(--color-border)" }}>•</span>
                        <span style={{ color: "var(--color-text-muted)" }}>
                          {t("assignments.marksLabel")} {sub.assignmentMaxMarks}
                        </span>
                      </div>
                    </div>

                    {/* Right side: Score & Action Button */}
                    <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                      {sub.status === "graded" && (
                        <div className="text-right">
                          <div className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>
                            {sub.marksObtained}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            / {sub.assignmentMaxMarks} pts
                          </div>
                        </div>
                      )}

                      <Link
                        href={`/student/assignments/${sub.assignmentId}`}
                        className="px-4 py-2 text-xs font-bold rounded-xl text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {sub.status === "pending" ? t("assignments.turnIn") : "View Details"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
