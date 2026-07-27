"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getExams, createExam, deleteExam } from "@/actions/examActions";
import { Award, Trash2, Plus, Loader2, Eye, Calendar, ArrowRight } from "lucide-react";
import type { BatchDoc, ExamDoc } from "@/types";
import Link from "next/link";


export default function TutorExamsPage() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [exams, setExams] = useState<ExamDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  
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
    if (!user) return;
    loadData();
  }, [user, selectedBatchId]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: batchesData } = await supabase
        .from("batches")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (batchesData) {
        setBatches(batchesData.map((b) => ({
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
        })));
        if (!formData.batchId && batchesData.length > 0) {
          setFormData(prev => ({ ...prev, batchId: batchesData[0].id }));
        }
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      const batchFilter = selectedBatchId === "all" ? null : selectedBatchId;
      const data = await getExams(batchFilter, token);
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
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token || !user) throw new Error("Authentication error");

      await createExam({
        title: formData.title,
        subject: formData.subject || null,
        batchId: formData.batchId,
        examDate: formData.examDate,
        totalMarks: formData.totalMarks,
        passMarks: formData.passMarks || null,
      }, token);

      setFormData(prev => ({ ...prev, title: "", subject: "", examDate: "" }));
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create exam");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this exam? All results will be lost.")) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      await deleteExam(id, token);
      setExams(exams.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete exam");
    }
  };

  if (authLoading) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            Exams & Results
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Schedule exams, record marks, and publish results.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form (Side) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#1e1e2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs p-5 sticky top-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Create New Exam
            </h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Batch</label>
                <select
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#13131f] text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Exam Title</label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Physics Exam"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#13131f] text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Subject (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Vector Algebra"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#13131f] text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Exam Date</label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#13131f] text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
                    className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#13131f] text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Pass Marks</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.passMarks}
                    onChange={(e) => setFormData({ ...formData, passMarks: parseInt(e.target.value) })}
                    className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#13131f] text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 text-red-600 dark:text-red-400 text-sm font-medium">
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Exam"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* List View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#1e1e2e] rounded-2xl border border-slate-200 dark:border-white/10 p-4 shadow-xs flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter by Batch:</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="rounded-lg border-slate-200 dark:border-white/10 text-sm py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#1e1e2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Loading exams...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-[#1e1e2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
              <div className="w-16 h-16 bg-slate-50 dark:bg-[#13131f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No exams found</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto text-sm">
                You haven't scheduled any exams yet. Create one using the form.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {exams.map(exam => {
                const batch = batches.find(b => b.id === exam.batchId);
                return (
                  <div key={exam.id} className="bg-white dark:bg-[#1e1e2e] rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 border border-indigo-100">
                            {batch?.name || "Unknown Batch"}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{exam.title}</h3>
                        {exam.subject && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{exam.subject}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors"
                        title="Delete Exam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-5 bg-slate-50 dark:bg-[#13131f] rounded-xl p-3 border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium">{new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-white/10 pl-4">
                        <Award className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium">Total: {exam.totalMarks} Marks</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/5">
                      <Link
                        href={`/tutor/exams/${exam.id}`}
                        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors"
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
    </div>
  );
}
