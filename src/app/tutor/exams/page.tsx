"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { getExams, createExam, deleteExam } from "@/actions/examActions";
import {
  Award, Trash2, Plus, Loader2, Calendar, ArrowRight, X, AlertCircle,
} from "lucide-react";
import type { BatchDoc, ExamDoc } from "@/types";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/client";

// ─── Confirm Delete Modal ──────────────────────────────────────────────────────

function ConfirmModal({
  examTitle, onConfirm, onCancel, loading,
}: {
  examTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-rose-500/10 shrink-0">
            <Trash2 className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Delete Exam?
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              <span className="font-semibold">&ldquo;{examTitle}&rdquo;</span> will be permanently
              deleted along with all student results. This cannot be undone.
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-1 rounded-lg ml-auto shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold rounded-xl border transition-colors"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete Exam
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TutorExamsPage() {
  const { user, claims, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [exams, setExams] = useState<ExamDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ExamDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    batchId: "",
    examDate: "",
    totalMarks: 100,
    passMarks: 33,
  });

  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, claims, authLoading, selectedBatchId]);

  async function loadData() {
    setLoading(true);
    try {
      const tutorId = (claims && "tutorId" in claims ? (claims as unknown as Record<string, unknown>).tutorId : null) as string | null || user!.id;
      const { data: batchesData } = await supabase
        .from("batches")
        .select("*")
        .eq("tutor_id", tutorId as string)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (batchesData) {
        const mapped: BatchDoc[] = batchesData.map((b) => ({
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
        }));
        setBatches(mapped);
        if (!formData.batchId && mapped.length > 0) {
          setFormData((prev) => ({ ...prev, batchId: mapped[0].id }));
        }
      }

      const batchFilter = selectedBatchId === "all" ? null : selectedBatchId;
      const data = await getExams(batchFilter);
      setExams(data.exams);
    } catch (err) {
      console.error("Failed to load exams data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!formData.title.trim() || !formData.batchId || !formData.examDate) {
      setCreateError("Please fill out all required fields.");
      return;
    }

    try {
      setIsCreating(true);
      await createExam({
        title: formData.title,
        subject: formData.subject || null,
        batchId: formData.batchId,
        examDate: formData.examDate,
        totalMarks: formData.totalMarks,
        passMarks: formData.passMarks || null,
      });

      setFormData((prev) => ({ ...prev, title: "", subject: "", examDate: "" }));
      await loadData();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create exam");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteExam(deleteTarget.id);
      setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete exam");
    } finally {
      setDeleting(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all";

  if (authLoading) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            {t("exams.title")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t("exams.subtitle")}</p>
        </div>
      </div>

      {/* Delete Error Banner */}
      {deleteError && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError("")} className="ml-auto">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs p-5 sticky top-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Create New Exam
            </h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Batch */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Batch *
                </label>
                <select
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className={inputCls}
                  required
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.subject})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Exam Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Physics Exam"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Subject (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vector Algebra"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Exam Date *
                </label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>

              {/* Marks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Total Marks *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalMarks}
                    onChange={(e) =>
                      setFormData({ ...formData, totalMarks: parseInt(e.target.value) })
                    }
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Pass Marks
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.passMarks}
                    onChange={(e) =>
                      setFormData({ ...formData, passMarks: parseInt(e.target.value) })
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Exam
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Exam List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 p-4 shadow-xs flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Filter by Batch:
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] text-sm px-3 py-1.5 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              >
                <option value="all">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {exams.length} exam{exams.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Loading exams...</p>
            </div>
          ) : exams.length === 0 ? (
            <EmptyState
              variant="exams"
              title="No exams scheduled yet"
              description="Create your first exam to record student marks and publish report cards."
              action={{ label: "Create exam above", onClick: () => {} }}
            />
          ) : (
            <div className="grid gap-4">
              {exams.map((exam) => {
                const batch = batches.find((b) => b.id === exam.batchId);
                return (
                  <div
                    key={exam.id}
                    className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                            {batch?.name || "Unknown Batch"}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                          {exam.title}
                        </h3>
                        {exam.subject && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {exam.subject}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => { setDeleteTarget(exam); setDeleteError(""); }}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-xl transition-colors"
                        title="Delete Exam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-5 bg-slate-50 dark:bg-[#0b0f19] rounded-xl p-3 border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium">
                          {new Date(exam.examDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-white/10 pl-4">
                        <Award className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium">Total: {exam.totalMarks} Marks</span>
                      </div>
                      {exam.passMarks && (
                        <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-white/10 pl-4">
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            Pass: {exam.passMarks}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/5">
                      <Link
                        href={`/tutor/exams/${exam.id}`}
                        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-4 py-2 rounded-xl transition-colors"
                      >
                        Enter Marks / View Results
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <ConfirmModal
          examTitle={deleteTarget.title}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteError(""); }}
          loading={deleting}
        />
      )}
    </div>
  );
}
