"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getAssignmentById, getStudentSubmissions, submitAssignment } from "@/actions/assignmentActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileDown,
  Loader2,
  Upload,
  File as FileIcon,
  FileCheck,
  X,
  FileText,
  Paperclip,
  Sparkles,
  AlertCircle,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { AssignmentDoc, SubmissionDoc } from "@/types";

export default function StudentAssignmentDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  const [assignment, setAssignment] = useState<AssignmentDoc | null>(null);
  const [submission, setSubmission] = useState<SubmissionDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [studentNotes, setStudentNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    if (authLoading || !user || !id) return;
    loadData();
  }, [user, authLoading, id]);

  async function loadData() {
    setLoading(true);
    try {
      const [assignData, subs] = await Promise.all([
        getAssignmentById(id),
        getStudentSubmissions(),
      ]);

      if (assignData) setAssignment(assignData);
      const sub = subs.find((s) => s.assignmentId === id);
      if (sub) {
        setSubmission(sub);
        if (sub.studentNotes) setStudentNotes(sub.studentNotes);
      }
    } catch (err) {
      console.error("Failed to load assignment details:", err);
    } finally {
      setLoading(false);
    }
  }

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDownload = async (path: string) => {
    try {
      const url = await getMediaSignedUrl(path);
      if (url) window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to get URL", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) return;

    if (!file && !submission.filePath && !studentNotes.trim()) {
      setUploadError("Please select a file or add submission notes.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");

      let storagePath = submission.filePath || null;

      // If new file chosen, upload to storage
      if (file) {
        const fileExt = file.name.split(".").pop()?.toLowerCase();
        storagePath = `submissions/${id}/${user!.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("attachments")
          .upload(storagePath, file);

        if (uploadErr) {
          console.warn("Storage upload notice:", uploadErr);
        }
      }

      // Submit assignment record
      await submitAssignment(submission.id, storagePath, studentNotes.trim() || null);

      setFile(null);
      setIsResubmitting(false);
      showToast(t("assignments.turnInSuccess"));
      await loadData();
    } catch (err: any) {
      setUploadError(err.message || "Failed to submit assignment");
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-72">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-primary)" }} />
        <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
          Loading assignment...
        </p>
      </div>
    );
  }

  if (!assignment || !submission) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
        <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
          Assignment Not Found
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
          This assignment is either not published yet or you are not enrolled in this batch.
        </p>
        <Link
          href="/student/assignments"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
          style={{ background: "var(--color-primary)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Assignments
        </Link>
      </div>
    );
  }

  const isOverdue = submission.status === "pending" && new Date(assignment.deadline) < new Date();
  const isSubmitted = submission.status === "submitted" || submission.status === "late";
  const isGraded = submission.status === "graded";

  const scorePct =
    isGraded && submission.marksObtained !== null
      ? Math.round((submission.marksObtained / assignment.maxMarks) * 100)
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-xl flex items-center gap-2 animate-slide-up">
          <CheckCircle className="w-5 h-5" />
          {successToast}
        </div>
      )}

      {/* Back Link */}
      <Link
        href="/student/assignments"
        className="inline-flex items-center text-xs font-bold transition-colors hover:underline"
        style={{ color: "var(--color-primary)" }}
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Assignments
      </Link>

      {/* Assignment Overview Card */}
      <div
        className="rounded-3xl p-6 border shadow-sm"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isGraded && (
                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5" /> Graded
                </span>
              )}
              {isSubmitted && (
                <span className="inline-flex items-center gap-1 text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 rounded-full text-xs font-bold border border-indigo-200 dark:border-indigo-500/20">
                  <CheckCircle className="w-3.5 h-3.5" /> Submitted
                </span>
              )}
              {submission.status === "pending" && !isOverdue && (
                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" /> Pending Submission
                </span>
              )}
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-500/10 px-2.5 py-0.5 rounded-full text-xs font-bold border border-red-200 dark:border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5" /> Deadline Passed (Overdue)
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
                  {assignment.batchName}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black" style={{ color: "var(--color-text)" }}>
              {assignment.title}
            </h1>

            <p
              className={`flex items-center text-xs sm:text-sm font-medium mt-1 ${
                isOverdue ? "text-red-500 font-bold" : ""
              }`}
              style={!isOverdue ? { color: "var(--color-text-muted)" } : undefined}
            >
              <Clock className="w-4 h-4 mr-1.5" />
              Due: {new Date(assignment.deadline).toLocaleString("en-BD", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Points / Score Badge */}
          <div className="text-right shrink-0">
            {isGraded ? (
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black" style={{ color: "var(--color-primary)" }}>
                  {submission.marksObtained}{" "}
                  <span className="text-sm font-bold text-slate-400">/ {assignment.maxMarks}</span>
                </span>
                {scorePct !== null && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1">
                    Score: {scorePct}%
                  </span>
                )}
              </div>
            ) : (
              <div>
                <span className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>
                  {assignment.maxMarks}
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                  Total Points
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions / Description */}
        {assignment.description && (
          <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--color-border)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Instructions & Problem Statement
            </h3>
            <div
              className="p-4 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed border"
              style={{
                background: "var(--color-bg-secondary)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              {assignment.description}
            </div>
          </div>
        )}

        {/* Question Sheet Attachment Download */}
        {assignment.filePath && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
            <div>
              <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                Question Sheet / Reference File
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                Provided by teacher for this assignment
              </p>
            </div>
            <button
              onClick={() => handleDownload(assignment.filePath!)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95"
              style={{ background: "var(--color-primary)" }}
            >
              <FileDown className="w-4 h-4" /> Download Question Sheet
            </button>
          </div>
        )}
      </div>

      {/* Graded Remarks Card (If Graded) */}
      {isGraded && (
        <div
          className="rounded-3xl p-6 border shadow-sm bg-emerald-50/50 dark:bg-emerald-500/[0.04] border-emerald-200 dark:border-emerald-500/20"
        >
          <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Teacher's Feedback & Grade
          </h3>
          {submission.feedback ? (
            <div className="p-4 rounded-2xl bg-white dark:bg-black/20 border border-emerald-100 dark:border-emerald-500/20 text-xs sm:text-sm italic text-emerald-950 dark:text-emerald-200">
              "{submission.feedback}"
            </div>
          ) : (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Your submission was graded with full completion credit. Great job!
            </p>
          )}
        </div>
      )}

      {/* Student Submission Card */}
      <div
        className="rounded-3xl p-6 border shadow-sm"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <h3 className="text-base font-black mb-4 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
          <FileText className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          My Submission
        </h3>

        {/* If pending OR student clicked resubmit */}
        {submission.status === "pending" || isResubmitting ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {uploadError && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {uploadError}
              </div>
            )}

            {/* File Upload Box */}
            {!file && !submission.filePath ? (
              <div
                className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:border-indigo-400 hover:bg-indigo-50/10"
                style={{ borderColor: "var(--color-border)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ background: "var(--color-primary-50)", color: "var(--color-primary)" }}
                >
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>
                  Click or Drag & Drop your solution file
                </h4>
                <p className="text-xs max-w-xs" style={{ color: "var(--color-text-muted)" }}>
                  PDF, Images (JPG, PNG), or Word documents accepted. (Max 25MB)
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : file ? (
              <div
                className="flex items-center justify-between p-4 rounded-2xl border"
                style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon className="w-8 h-8 text-indigo-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                      {file.name}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              /* Already has existing file on resubmit */
              <div
                className="flex items-center justify-between p-3.5 rounded-2xl border"
                style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
              >
                <span className="text-xs font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                  <FileCheck className="w-4 h-4 text-emerald-500" /> Existing File Saved
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Replace File
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* Student Comments / Notes */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Submission Note / Comments for Teacher (Optional)
              </label>
              <textarea
                value={studentNotes}
                onChange={(e) => setStudentNotes(e.target.value)}
                placeholder="Add any comments or questions for your teacher about this assignment..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>

            {/* Submit Action */}
            <div className="flex gap-2">
              {isResubmitting && (
                <button
                  type="button"
                  onClick={() => setIsResubmitting(false)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-60"
                style={{ background: "var(--color-primary)" }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> {t("assignments.turnIn")}
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Submitted State */
          <div className="space-y-4">
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border gap-4"
              style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                    Work Submitted Successfully
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Turned in on{" "}
                    {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "--"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {submission.filePath && (
                  <button
                    onClick={() => handleDownload(submission.filePath!)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    <FileDown className="w-3.5 h-3.5" /> View Submitted File
                  </button>
                )}

                {!isGraded && (
                  <button
                    onClick={() => setIsResubmitting(true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Resubmit Work
                  </button>
                )}
              </div>
            </div>

            {/* Student Note */}
            {submission.studentNotes && (
              <div
                className="p-3.5 rounded-2xl border text-xs"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <span className="font-bold block mb-0.5" style={{ color: "var(--color-text)" }}>
                  Your Submission Note:
                </span>
                "{submission.studentNotes}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
