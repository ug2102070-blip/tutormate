"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import {
  getAssignmentById,
  getSubmissions,
  gradeSubmission,
  manualStudentSubmission,
  syncAssignmentStudents,
  remindPendingStudents,
  updateAssignment,
} from "@/actions/assignmentActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileDown,
  Loader2,
  XCircle,
  Search,
  Download,
  Bell,
  RefreshCw,
  Edit,
  Paperclip,
  User,
  MessageSquare,
  Sparkles,
  AlertCircle,
  X,
  FileText,
  Percent,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { AssignmentDoc, SubmissionDoc } from "@/types";

export default function AssignmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  const [assignment, setAssignment] = useState<AssignmentDoc | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterTab, setFilterTab] = useState<"all" | "toGrade" | "graded" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Grading Modal / Drawer
  const [gradingSub, setGradingSub] = useState<SubmissionDoc | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [gradingError, setGradingError] = useState("");

  // Manual Offline Grade Modal
  const [offlineSub, setOfflineSub] = useState<SubmissionDoc | null>(null);
  const [offlineMarks, setOfflineMarks] = useState<number>(0);
  const [offlineFeedback, setOfflineFeedback] = useState("");

  // Action status states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReminding, setIsReminding] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (authLoading || !user || !id) return;
    loadData();
  }, [user, authLoading, id]);

  async function loadData() {
    setLoading(true);
    try {
      const [assignData, subsData] = await Promise.all([
        getAssignmentById(id),
        getSubmissions(id),
      ]);
      if (assignData) setAssignment(assignData);
      setSubmissions(subsData);
    } catch (err) {
      console.error("Failed to load assignment details:", err);
    } finally {
      setLoading(false);
    }
  }

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleDownload = async (path: string) => {
    try {
      const url = await getMediaSignedUrl(path);
      if (url) window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to get URL", err);
    }
  };

  const handleSyncStudents = async () => {
    try {
      setIsSyncing(true);
      const res = await syncAssignmentStudents(id);
      showToast(
        res.countAdded > 0
          ? `${res.countAdded} new students added to this assignment.`
          : "All enrolled students are already synced."
      );
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to sync students");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemindPending = async () => {
    if (!window.confirm(t("assignments.remindConfirm"))) return;
    try {
      setIsReminding(true);
      const res = await remindPendingStudents(id);
      showToast(
        res.remindedCount > 0
          ? `${t("assignments.remindSuccess")} (${res.remindedCount} students)`
          : "No pending students to remind."
      );
    } catch (err) {
      console.error(err);
      alert("Failed to send reminders");
    } finally {
      setIsReminding(false);
    }
  };

  const openGradingModal = (sub: SubmissionDoc) => {
    setGradingSub(sub);
    setMarks(sub.marksObtained !== null && sub.marksObtained !== undefined ? sub.marksObtained : (assignment?.maxMarks || 100));
    setFeedback(sub.feedback || "");
    setGradingError("");
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSub || !assignment) return;
    setGradingError("");

    if (marks < 0 || marks > assignment.maxMarks) {
      setGradingError(`Marks must be between 0 and ${assignment.maxMarks}`);
      return;
    }

    try {
      setIsSubmittingGrade(true);
      await gradeSubmission(gradingSub.id, {
        marksObtained: marks,
        feedback: feedback.trim() || undefined,
      });

      setGradingSub(null);
      showToast("Grade and feedback saved! Student has been notified.");
      await loadData();
    } catch (err: any) {
      setGradingError(err.message || "Failed to save grade");
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const handleSaveOfflineGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineSub || !assignment) return;

    try {
      setIsSubmittingGrade(true);
      await manualStudentSubmission(offlineSub.id, {
        marksObtained: offlineMarks,
        feedback: offlineFeedback.trim() || undefined,
        status: "graded",
      });

      setOfflineSub(null);
      showToast("Offline submission recorded and graded!");
      await loadData();
    } catch (err: any) {
      alert("Failed to save offline grade: " + err.message);
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const exportGradesCSV = () => {
    if (!assignment || submissions.length === 0) return;

    const headers = ["Student Name", "Phone", "Status", "Submitted At", "Marks Obtained", "Max Marks", "Feedback", "Student Notes"];
    const rows = submissions.map((s) => [
      `"${s.studentName || ""}"`,
      `"${s.studentPhone || ""}"`,
      s.status,
      s.submittedAt ? `"${new Date(s.submittedAt).toLocaleString()}"` : "N/A",
      s.marksObtained !== null && s.marksObtained !== undefined ? s.marksObtained : "N/A",
      assignment.maxMarks,
      `"${(s.feedback || "").replace(/"/g, '""')}"`,
      `"${(s.studentNotes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${assignment.title.replace(/[^a-zA-Z0-9]/g, "_")}_Grades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesSearch =
        !searchQuery ||
        (sub.studentName && sub.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sub.studentPhone && sub.studentPhone.includes(searchQuery));

      if (!matchesSearch) return false;

      if (filterTab === "toGrade") return sub.status === "submitted" || sub.status === "late";
      if (filterTab === "graded") return sub.status === "graded";
      if (filterTab === "pending") return sub.status === "pending";
      return true;
    });
  }, [submissions, searchQuery, filterTab]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "var(--color-primary)" }} />
        <p className="text-sm mt-3" style={{ color: "var(--color-text-muted)" }}>
          Loading assignment & submissions...
        </p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Assignment not found
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          This assignment may have been deleted or moved.
        </p>
        <Link
          href="/tutor/assignments"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
          style={{ background: "var(--color-primary)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assignments
        </Link>
      </div>
    );
  }

  const totalEnrolled = submissions.length;
  const toGradeCount = submissions.filter((s) => s.status === "submitted" || s.status === "late").length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;
  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  const gradedMarksList = submissions
    .filter((s) => s.status === "graded" && s.marksObtained !== null)
    .map((s) => Number(s.marksObtained));

  const averageScore =
    gradedMarksList.length > 0
      ? Math.round((gradedMarksList.reduce((a, b) => a + b, 0) / gradedMarksList.length) * 10) / 10
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-xl flex items-center gap-2 animate-slide-up">
          <CheckCircle className="w-5 h-5" />
          {actionSuccessMsg}
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/tutor/assignments"
          className="inline-flex items-center text-xs font-bold transition-colors hover:underline"
          style={{ color: "var(--color-primary)" }}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to All Assignments
        </Link>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncStudents}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            title="Sync any new batch students into this assignment"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {t("assignments.syncStudents")}
          </button>

          {pendingCount > 0 && (
            <button
              onClick={handleRemindPending}
              disabled={isReminding}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors text-amber-700 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100"
            >
              <Bell className="w-3.5 h-3.5" />
              {t("assignments.remindBtn")} ({pendingCount})
            </button>
          )}

          {submissions.length > 0 && (
            <button
              onClick={exportGradesCSV}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border"
              style={{
                background: "var(--color-bg-secondary)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              <Download className="w-3.5 h-3.5" />
              {t("assignments.exportCsv")}
            </button>
          )}
        </div>
      </div>

      {/* Assignment Summary Banner Card */}
      <div
        className="rounded-3xl p-6 border shadow-sm"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Main Info */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {assignment.isPublished ? (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border"
                  style={{
                    background: "rgba(16,185,129,0.1)",
                    color: "var(--color-success)",
                    borderColor: "rgba(16,185,129,0.2)",
                  }}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> {t("assignments.publishedBtn")}
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    color: "var(--color-warning)",
                    borderColor: "rgba(245,158,11,0.2)",
                  }}
                >
                  <Clock className="w-3.5 h-3.5" /> {t("assignments.draftStatus")}
                </span>
              )}

              {assignment.batchName && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: "var(--color-primary-50)",
                    color: "var(--color-primary)",
                  }}
                >
                  Batch: {assignment.batchName} {assignment.batchSubject ? `(${assignment.batchSubject})` : ""}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--color-text)" }}>
              {assignment.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Due:{" "}
                <strong style={{ color: "var(--color-text)" }}>
                  {new Date(assignment.deadline).toLocaleString("en-BD", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </span>
              <span>•</span>
              <span>
                Max Marks: <strong style={{ color: "var(--color-text)" }}>{assignment.maxMarks}</strong>
              </span>
            </div>

            {/* Description */}
            {assignment.description && (
              <div
                className="p-4 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap border leading-relaxed"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {assignment.description}
              </div>
            )}

            {/* Question File Attachment */}
            {assignment.filePath && (
              <div className="pt-1">
                <button
                  onClick={() => handleDownload(assignment.filePath!)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                  style={{
                    background: "var(--color-primary-50)",
                    color: "var(--color-primary)",
                  }}
                >
                  <Paperclip className="w-4 h-4" />
                  {t("assignments.downloadQuestion")} (.pdf/file)
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 lg:w-72 shrink-0">
            <div
              className="p-3.5 rounded-2xl border text-center"
              style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
            >
              <div className="text-xl font-black" style={{ color: "var(--color-text)" }}>
                {totalEnrolled}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Enrolled
              </div>
            </div>

            <div
              className="p-3.5 rounded-2xl border text-center bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20"
            >
              <div className="text-xl font-black text-amber-700 dark:text-amber-400">
                {toGradeCount}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mt-0.5">
                To Grade
              </div>
            </div>

            <div
              className="p-3.5 rounded-2xl border text-center bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
            >
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                {gradedCount}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mt-0.5">
                Graded
              </div>
            </div>

            <div
              className="p-3.5 rounded-2xl border text-center"
              style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
            >
              <div className="text-xl font-black" style={{ color: "var(--color-primary)" }}>
                {averageScore !== null ? `${averageScore}` : "--"}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Avg Score
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Section */}
      <div
        className="rounded-3xl border shadow-sm overflow-hidden"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Table Controls & Filter Tabs */}
        <div
          className="p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-b"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg-secondary)",
          }}
        >
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { key: "all", label: `All (${submissions.length})` },
              { key: "toGrade", label: `To Grade (${toGradeCount})` },
              { key: "graded", label: `Graded (${gradedCount})` },
              { key: "pending", label: `Pending (${pendingCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key as any)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                style={{
                  background: filterTab === tab.key ? "var(--color-surface)" : "transparent",
                  color: filterTab === tab.key ? "var(--color-primary)" : "var(--color-text-muted)",
                  boxShadow: filterTab === tab.key ? "var(--shadow-card)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or phone..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            />
          </div>
        </div>

        {/* Submissions List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="border-b text-[11px] font-bold uppercase tracking-wider"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-muted)",
                  background: "var(--color-bg-secondary)",
                }}
              >
                <th className="p-4">Student</th>
                <th className="p-4">Status</th>
                <th className="p-4">Submission</th>
                <th className="p-4 text-center">Score</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                    No student submissions found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isSubmitted = sub.status === "submitted" || sub.status === "late";
                  const isGraded = sub.status === "graded";
                  const isPending = sub.status === "pending";

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Student Info */}
                      <td className="p-4">
                        <div className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                          {sub.studentName}
                        </div>
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {sub.studentPhone || "No phone listed"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg text-xs font-bold">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                        {sub.status === "submitted" && (
                          <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-200 dark:border-amber-500/20">
                            <FileDown className="w-3 h-3" /> Submitted
                          </span>
                        )}
                        {sub.status === "late" && (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-200 dark:border-red-500/20">
                            <AlertCircle className="w-3 h-3" /> Late Submission
                          </span>
                        )}
                        {isGraded && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" /> Graded
                          </span>
                        )}
                      </td>

                      {/* Submission File & Notes */}
                      <td className="p-4">
                        <div className="space-y-1">
                          {sub.filePath ? (
                            <button
                              onClick={() => handleDownload(sub.filePath!)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                              style={{
                                background: "var(--color-primary-50)",
                                color: "var(--color-primary)",
                              }}
                            >
                              <FileDown className="w-3.5 h-3.5" /> View File
                            </button>
                          ) : isPending ? (
                            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                              Not uploaded
                            </span>
                          ) : (
                            <span className="text-xs font-medium italic text-slate-400">
                              Physical / Paper
                            </span>
                          )}

                          {sub.submittedAt && (
                            <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                              {new Date(sub.submittedAt).toLocaleDateString("en-BD", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}

                          {sub.studentNotes && (
                            <div
                              className="text-[11px] p-1.5 rounded-lg border max-w-xs mt-1 italic line-clamp-2"
                              style={{
                                background: "var(--color-bg-secondary)",
                                borderColor: "var(--color-border)",
                                color: "var(--color-text-secondary)",
                              }}
                              title={sub.studentNotes}
                            >
                              "{sub.studentNotes}"
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Marks Obtained */}
                      <td className="p-4 text-center">
                        {isGraded ? (
                          <div>
                            <span className="font-black text-base" style={{ color: "var(--color-text)" }}>
                              {sub.marksObtained}
                            </span>
                            <span className="text-xs text-slate-400 font-medium"> / {assignment.maxMarks}</span>
                            {sub.feedback && (
                              <div
                                className="text-[10px] italic mt-0.5 max-w-[150px] mx-auto truncate"
                                style={{ color: "var(--color-text-muted)" }}
                                title={sub.feedback}
                              >
                                "{sub.feedback}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>--</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSubmitted && (
                            <button
                              onClick={() => openGradingModal(sub)}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl text-white transition-all shadow-sm"
                              style={{ background: "var(--color-primary)" }}
                            >
                              Grade Work
                            </button>
                          )}

                          {isGraded && (
                            <button
                              onClick={() => openGradingModal(sub)}
                              className="px-2.5 py-1 text-xs font-bold rounded-xl border transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                              style={{
                                borderColor: "var(--color-border)",
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              Edit Grade
                            </button>
                          )}

                          {isPending && (
                            <button
                              onClick={() => {
                                setOfflineSub(sub);
                                setOfflineMarks(assignment.maxMarks);
                                setOfflineFeedback("");
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                              style={{
                                borderColor: "var(--color-border)",
                                color: "var(--color-text-muted)",
                              }}
                              title="Mark submission offline"
                            >
                              + Offline Grade
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── GRADING MODAL ─────────────────────────────────────────────────── */}
      {gradingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl relative"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  Grade Assignment
                </h3>
                <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Student: <strong style={{ color: "var(--color-text)" }}>{gradingSub.studentName}</strong>
                </p>
              </div>
              <button
                onClick={() => setGradingSub(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gradingError && (
              <div className="p-3 rounded-xl mb-4 text-xs font-semibold bg-red-50 text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {gradingError}
              </div>
            )}

            {gradingSub.filePath && (
              <div className="mb-4 p-3 rounded-2xl border flex items-center justify-between" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}>
                <span className="text-xs font-bold truncate">Submitted File Available</span>
                <button
                  type="button"
                  onClick={() => handleDownload(gradingSub.filePath!)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg text-white"
                  style={{ background: "var(--color-primary)" }}
                >
                  Open File
                </button>
              </div>
            )}

            <form onSubmit={handleSaveGrade} className="space-y-4">
              {/* Score Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    {t("assignments.marksObtained")} (Max: {assignment.maxMarks})
                  </label>
                  {/* Quick percentage buttons */}
                  <div className="flex gap-1">
                    {[1, 0.9, 0.8, 0.5, 0].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setMarks(Math.round(assignment.maxMarks * pct))}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-white/10"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {pct * 100}%
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  required
                  min={0}
                  max={assignment.maxMarks}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl text-lg font-black outline-none text-center"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  {t("assignments.feedbackLabel")}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Excellent work on solving equations. Pay attention to unit conversions."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingSub(null)}
                  className="flex-1 py-2.5 font-bold text-xs rounded-xl border"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGrade}
                  className="flex-1 py-2.5 font-bold text-xs rounded-xl text-white transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "var(--color-primary)" }}
                >
                  {isSubmittingGrade ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t("assignments.saveGrade")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── OFFLINE MANUAL GRADE MODAL ────────────────────────────────────── */}
      {offlineSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl relative"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Record Physical / Offline Submission
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Student: <strong style={{ color: "var(--color-text)" }}>{offlineSub.studentName}</strong>
                </p>
              </div>
              <button
                onClick={() => setOfflineSub(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOfflineGrade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Marks Obtained (out of {assignment.maxMarks})
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={assignment.maxMarks}
                  value={offlineMarks}
                  onChange={(e) => setOfflineMarks(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl text-base font-bold outline-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Teacher Remarks / Notes
                </label>
                <textarea
                  value={offlineFeedback}
                  onChange={(e) => setOfflineFeedback(e.target.value)}
                  placeholder="Notes on physical copy submission..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOfflineSub(null)}
                  className="flex-1 py-2.5 font-bold text-xs rounded-xl border"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGrade}
                  className="flex-1 py-2.5 font-bold text-xs rounded-xl text-white transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "var(--color-primary)" }}
                >
                  {isSubmittingGrade ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Record & Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
