"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  publishAssignment,
  unpublishAssignment,
  deleteAssignment,
  remindPendingStudents,
} from "@/actions/assignmentActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import {
  BookOpen,
  Trash2,
  Plus,
  Loader2,
  Eye,
  Calendar,
  FileText,
  ArrowRight,
  Edit,
  Upload,
  FileCheck,
  Clock,
  CheckCircle,
  Bell,
  Search,
  X,
  FileDown,
  Paperclip,
  Sparkles,
  AlertCircle,
  Users,
  Award,
  CheckCircle2,
  LayoutGrid,
  List,
  ListPlus,
  Heading,
} from "lucide-react";
import type { BatchDoc, AssignmentDoc } from "@/types";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

// Helper to strip markdown symbols for clean snippet previews on cards
function cleanMarkdownSnippet(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/^#+\s+/gm, "") // remove heading hashes (#, ##, ###)
    .replace(/\*\*(.*?)\*\*/g, "$1") // remove bold **text**
    .replace(/\*(.*?)\*/g, "$1") // remove italic *text*
    .replace(/_{1,2}(.*?)_{1,2}/g, "$1") // remove underscore italics/bolds
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1") // remove code backticks
    .replace(/---/g, " ") // remove horizontal rules
    .replace(/\$[^\$]+\$/g, "") // remove latex math formulas
    .replace(/\n+/g, " ") // normalize newlines to single space
    .trim();
}

function AssignmentDescriptionPreview({ text }: { text: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const cleaned = cleanMarkdownSnippet(text);
  if (!cleaned) return null;

  const isLong = cleaned.length > 110 || text.includes("\n");

  return (
    <div
      className="p-2.5 rounded-xl border text-xs mb-3 transition-all duration-200"
      style={{
        background: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
      }}
    >
      <div
        className={`leading-relaxed text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs ${
          expanded ? "whitespace-pre-line" : "overflow-hidden"
        }`}
        style={
          expanded
            ? { display: "block" }
            : {
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }
        }
      >
        {expanded ? text.replace(/^#+\s+/gm, "").replace(/\*\*/g, "") : cleaned}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="mt-1 text-[10px] sm:text-[11px] font-bold transition-colors hover:underline flex items-center gap-1"
          style={{ color: "var(--color-primary)" }}
        >
          {expanded ? "Show Less ↑" : "Show Full Topics & Details ↓"}
        </button>
      )}
    </div>
  );
}

export default function TutorAssignmentsPage() {
  const { user, claims, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentDoc | null>(null);

  // Create Form State
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    batchId: "",
    deadline: "",
    maxMarks: 100,
  });

  // Edit Modal State
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState("");
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Action status states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (authLoading || !user) return;
    loadData();
  }, [user, claims, authLoading, selectedBatchId]);

  async function loadData() {
    setLoading(true);
    try {
      const tutorId = (claims && "tutorId" in claims ? (claims as any).tutorId : null) || user!.id;
      const { data: batchesData } = await supabase
        .from("batches")
        .select("*")
        .eq("tutor_id", tutorId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (batchesData) {
        const mappedBatches = batchesData.map((b) => ({
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
        setBatches(mappedBatches);
        if (!formData.batchId && mappedBatches.length > 0) {
          setFormData((prev) => ({ ...prev, batchId: mappedBatches[0].id }));
        }
      }

      const batchFilter = selectedBatchId === "all" ? undefined : selectedBatchId;
      const data = await getAssignments(batchFilter);
      setAssignments(data);
    } catch (err) {
      console.error("Failed to load assignments data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Quick preset for deadline
  const setQuickDeadline = (hoursFromNow: number) => {
    const d = new Date();
    d.setTime(d.getTime() + hoursFromNow * 60 * 60 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setFormData((prev) => ({
      ...prev,
      deadline: `${year}-${month}-${day}T${hours}:${minutes}`,
    }));
  };

  const setEditQuickDeadline = (hoursFromNow: number) => {
    if (!editingAssignment) return;
    const d = new Date();
    d.setTime(d.getTime() + hoursFromNow * 60 * 60 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setEditingAssignment({
      ...editingAssignment,
      deadline: `${year}-${month}-${day}T${hours}:${minutes}`,
    });
  };

  // Helper formatting inserters
  const insertFormatting = (isEditing: boolean, prefix: string) => {
    if (isEditing) {
      setEditingAssignment((prev) => {
        if (!prev) return null;
        const current = prev.description || "";
        const updated = current ? `${current}\n${prefix}` : prefix;
        return { ...prev, description: updated };
      });
      setTimeout(() => editTextareaRef.current?.focus(), 50);
    } else {
      setFormData((prev) => {
        const current = prev.description || "";
        const updated = current ? `${current}\n${prefix}` : prefix;
        return { ...prev, description: updated };
      });
      setTimeout(() => createTextareaRef.current?.focus(), 50);
    }
  };

  const uploadAttachment = async (file: File, folder = "assignments"): Promise<string> => {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const storagePath = `${folder}/${user!.id}/${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadErr } = await supabase.storage.from("attachments").upload(storagePath, file);
    if (uploadErr) {
      console.warn("Storage upload warning:", uploadErr);
    }
    return storagePath;
  };

  const handleCreateSubmit = async (publishImmediately: boolean) => {
    setCreateError("");

    if (!formData.title.trim() || !formData.batchId || !formData.deadline) {
      setCreateError("Please fill out title, batch, and deadline.");
      return;
    }

    try {
      setIsCreating(true);
      let uploadedFilePath: string | null = null;
      if (attachedFile) {
        uploadedFilePath = await uploadAttachment(attachedFile);
      }

      await createAssignment({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        batchId: formData.batchId,
        deadline: formData.deadline,
        maxMarks: formData.maxMarks,
        filePath: uploadedFilePath || undefined,
        isPublished: publishImmediately,
      });

      setFormData((prev) => ({
        ...prev,
        title: "",
        description: "",
        deadline: "",
      }));
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowCreateModal(false);

      showToast(publishImmediately ? "Assignment created & published!" : "Assignment draft saved!");
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create assignment");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    setEditError("");

    try {
      setIsUpdating(true);
      let uploadedFilePath = editingAssignment.filePath;

      if (editFile) {
        uploadedFilePath = await uploadAttachment(editFile);
      }

      await updateAssignment(editingAssignment.id, {
        title: editingAssignment.title.trim(),
        description: editingAssignment.description?.trim() || undefined,
        batchId: editingAssignment.batchId,
        deadline: editingAssignment.deadline,
        maxMarks: editingAssignment.maxMarks,
        filePath: uploadedFilePath || null,
      });

      setEditingAssignment(null);
      setEditFile(null);
      showToast(t("assignments.saveChanges"));
      await loadData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update assignment");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("assignments.deleteConfirm"))) return;
    try {
      setActionLoadingId(id);
      await deleteAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      showToast("Assignment deleted successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to delete assignment");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePublish = async (id: string) => {
    if (!window.confirm(t("assignments.publishConfirm"))) return;
    try {
      setActionLoadingId(id);
      await publishAssignment(id);
      showToast(t("assignments.publishedBtn"));
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to publish assignment");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnpublish = async (id: string) => {
    if (!window.confirm(t("assignments.unpublishConfirm"))) return;
    try {
      setActionLoadingId(id);
      await unpublishAssignment(id);
      showToast(t("assignments.unpublishBtn"));
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to unpublish assignment");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemindPending = async (id: string) => {
    if (!window.confirm(t("assignments.remindConfirm"))) return;
    try {
      setActionLoadingId(id);
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
      setActionLoadingId(null);
    }
  };

  const handleViewAttachment = async (path: string) => {
    try {
      const url = await getMediaSignedUrl(path);
      if (url) window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to get attachment URL", err);
    }
  };

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  if (authLoading) return null;

  // Filter assignments
  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.batchName && a.batchName.toLowerCase().includes(searchQuery.toLowerCase()));

    const isOverdue = new Date(a.deadline) < new Date();
    let matchesStatus = true;
    if (selectedStatus === "published") matchesStatus = a.isPublished;
    else if (selectedStatus === "draft") matchesStatus = !a.isPublished;
    else if (selectedStatus === "overdue") matchesStatus = isOverdue && a.isPublished;

    return matchesSearch && matchesStatus;
  });

  // Calculate high-level metrics
  const totalCount = assignments.length;
  const publishedCount = assignments.filter((a) => a.isPublished).length;
  const draftCount = assignments.filter((a) => !a.isPublished).length;
  const toGradeCount = assignments.reduce((acc, curr) => acc + (curr.submittedCount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 animate-slide-up">
          <CheckCircle className="w-4 h-4" />
          {actionSuccessMsg}
        </div>
      )}

      {/* Page Header with Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <FileText className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            {t("assignments.title")}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {t("assignments.subtitle")}
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              title: "",
              description: "",
              batchId: batches[0]?.id || "",
              deadline: "",
              maxMarks: 100,
            });
            setAttachedFile(null);
            setCreateError("");
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 hover:opacity-95 self-start sm:self-auto"
          style={{
            background: "linear-gradient(135deg, var(--color-primary) 0%, #4338ca 100%)",
          }}
        >
          <Plus className="w-4 h-4" />
          {t("assignments.createAssignment")}
        </button>
      </div>

      {/* Compact & Clean Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          className="px-3.5 py-2.5 rounded-xl border flex items-center justify-between"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              {t("assignments.total")}
            </div>
            <div className="text-lg font-black" style={{ color: "var(--color-text)" }}>
              {totalCount}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--color-primary-50)", color: "var(--color-primary)" }}>
            <FileText className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          className="px-3.5 py-2.5 rounded-xl border flex items-center justify-between bg-emerald-50/30 dark:bg-emerald-500/[0.03]"
          style={{ borderColor: "rgba(16,185,129,0.2)" }}
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {t("assignments.active")}
            </div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">
              {publishedCount}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600">
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          className="px-3.5 py-2.5 rounded-xl border flex items-center justify-between bg-amber-50/30 dark:bg-amber-500/[0.03]"
          style={{ borderColor: "rgba(245,158,11,0.2)" }}
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {t("assignments.toGrade")}
            </div>
            <div className="text-lg font-black text-amber-700 dark:text-amber-400">
              {toGradeCount}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-500/20 text-amber-600">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          className="px-3.5 py-2.5 rounded-xl border flex items-center justify-between"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              {t("assignments.drafts")}
            </div>
            <div className="text-lg font-black" style={{ color: "var(--color-text)" }}>
              {draftCount}
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-500">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div
        className="p-2.5 sm:p-3 rounded-2xl border flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shadow-sm"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("assignments.searchPlaceholder")}
            className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs outline-none transition-all"
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters & View Switcher */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold outline-none border"
            style={{
              background: "var(--color-bg-secondary)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <option value="all">{t("assignments.statusAll")}</option>
            <option value="published">{t("assignments.statusPublished")}</option>
            <option value="draft">{t("assignments.statusDraft")}</option>
            <option value="overdue">{t("assignments.overdue")}</option>
          </select>

          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold outline-none border max-w-[150px] truncate"
            style={{
              background: "var(--color-bg-secondary)",
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

          {/* View Mode Toggle */}
          <div
            className="flex items-center rounded-xl p-0.5 border"
            style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
          >
            <button
              onClick={() => setViewMode("grid")}
              className="p-1.5 rounded-lg transition-all"
              style={{
                background: viewMode === "grid" ? "var(--color-surface)" : "transparent",
                color: viewMode === "grid" ? "var(--color-primary)" : "var(--color-text-muted)",
                boxShadow: viewMode === "grid" ? "var(--shadow-card)" : "none",
              }}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="p-1.5 rounded-lg transition-all"
              style={{
                background: viewMode === "list" ? "var(--color-surface)" : "transparent",
                color: viewMode === "list" ? "var(--color-primary)" : "var(--color-text-muted)",
                boxShadow: viewMode === "list" ? "var(--shadow-card)" : "none",
              }}
              title="Compact List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Assignment Container */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: "var(--color-text-muted)" }}>
            <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: "var(--color-primary)" }} />
            <p className="text-xs font-medium">{t("assignments.loadingAssignments")}</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <EmptyState
            variant="assignments"
            title={t("assignments.noAssignmentsTitle")}
            description={
              searchQuery
                ? `No assignments match "${searchQuery}".`
                : selectedBatchId === "all"
                ? t("assignments.noAssignmentsDescAll")
                : t("assignments.noAssignmentsDescBatch")
            }
            action={{
              label: t("assignments.createAssignment"),
              href: "#",
              onClick: () => setShowCreateModal(true),
            }}
          />
        ) : viewMode === "grid" ? (
          /* ─── 2-COLUMN COMPACT GRID VIEW ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredAssignments.map((assignment) => {
              const isOverdue = new Date(assignment.deadline) < new Date();
              const isActionBusy = actionLoadingId === assignment.id;

              const totalEnrolled = assignment.totalStudents || 0;
              const submitted = assignment.submittedCount || 0;
              const graded = assignment.gradedCount || 0;
              const pending = assignment.pendingCount || 0;
              const submissionPct = totalEnrolled > 0 ? Math.round(((submitted + graded) / totalEnrolled) * 100) : 0;
              const cleanSnippet = cleanMarkdownSnippet(assignment.description);

              return (
                <div
                  key={assignment.id}
                  className="rounded-2xl p-4 border transition-all duration-200 hover:shadow-md flex flex-col justify-between group relative"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <div>
                    {/* Top Badges & Actions */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Status */}
                        {assignment.isPublished ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                            style={{
                              background: "rgba(16,185,129,0.1)",
                              color: "var(--color-success)",
                              borderColor: "rgba(16,185,129,0.2)",
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3" /> {t("assignments.publishedBtn")}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                            style={{
                              background: "rgba(245,158,11,0.1)",
                              color: "var(--color-warning)",
                              borderColor: "rgba(245,158,11,0.2)",
                            }}
                          >
                            <Clock className="w-3 h-3" /> {t("assignments.draftStatus")}
                          </span>
                        )}

                        {/* Batch */}
                        {assignment.batchName && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold truncate max-w-[120px]"
                            style={{
                              background: "var(--color-primary-50)",
                              color: "var(--color-primary)",
                            }}
                          >
                            {assignment.batchName}
                          </span>
                        )}

                        {/* Overdue */}
                        {isOverdue && assignment.isPublished && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                            style={{
                              background: "rgba(239,68,68,0.1)",
                              color: "var(--color-error)",
                              borderColor: "rgba(239,68,68,0.2)",
                            }}
                          >
                            {t("assignments.overdue")}
                          </span>
                        )}
                      </div>

                      {/* Quick Icons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingAssignment(assignment);
                            setEditFile(null);
                            setEditError("");
                          }}
                          disabled={isActionBusy}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Remind Pending */}
                        {assignment.isPublished && pending > 0 && (
                          <button
                            onClick={() => handleRemindPending(assignment.id)}
                            disabled={isActionBusy}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                            title={t("assignments.remindBtn")}
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(assignment.id)}
                          disabled={isActionBusy}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                          title="Delete"
                        >
                          {isActionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      className="font-bold text-sm sm:text-base leading-snug line-clamp-2 mb-1.5"
                      style={{ color: "var(--color-text)" }}
                      title={assignment.title}
                    >
                      {assignment.title}
                    </h3>

                    {/* Due Date & Marks */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium mb-2.5">
                      <span
                        className={`flex items-center ${isOverdue ? "text-red-500 font-bold" : ""}`}
                        style={!isOverdue ? { color: "var(--color-text-muted)" } : undefined}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(assignment.deadline).toLocaleDateString("en-BD", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span style={{ color: "var(--color-border)" }}>•</span>
                      <span style={{ color: "var(--color-text-muted)" }}>
                        {assignment.maxMarks} Marks
                      </span>

                      {assignment.filePath && (
                        <>
                          <span style={{ color: "var(--color-border)" }}>•</span>
                          <button
                            type="button"
                            onClick={() => handleViewAttachment(assignment.filePath!)}
                            className="inline-flex items-center gap-1 font-bold text-[10px]"
                            style={{ color: "var(--color-primary)" }}
                          >
                            <Paperclip className="w-2.5 h-2.5" /> Sheet
                          </button>
                        </>
                      )}
                    </div>

                    {/* Description & Topics Preview */}
                    <AssignmentDescriptionPreview text={assignment.description} />
                  </div>

                  {/* Card Bottom: Progress Bar & Primary Action */}
                  <div className="pt-2.5 border-t space-y-2.5" style={{ borderColor: "var(--color-border)" }}>
                    {assignment.isPublished && (
                      <div>
                        <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {submitted + graded} / {totalEnrolled} Submitted ({submissionPct}%)
                          </span>
                          <div className="flex gap-1.5">
                            {submitted > 0 && <span className="text-amber-600 font-bold">{submitted} To Grade</span>}
                            {graded > 0 && <span className="text-emerald-600 font-bold">{graded} Graded</span>}
                          </div>
                        </div>

                        <div
                          className="w-full h-1.5 rounded-full overflow-hidden flex"
                          style={{ background: "var(--color-bg-secondary)" }}
                        >
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${totalEnrolled > 0 ? (graded / totalEnrolled) * 100 : 0}%` }}
                          />
                          <div
                            className="h-full bg-amber-400 transition-all duration-300"
                            style={{ width: `${totalEnrolled > 0 ? (submitted / totalEnrolled) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="text-[11px] font-bold" style={{ color: "var(--color-text-muted)" }}>
                        {assignment.averageScore !== null && assignment.averageScore !== undefined ? (
                          <span className="text-emerald-600">Avg: {assignment.averageScore}/{assignment.maxMarks}</span>
                        ) : (
                          <span>{assignment.isPublished ? "Active" : "Draft"}</span>
                        )}
                      </div>

                      <Link
                        href={`/tutor/assignments/${assignment.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {t("assignments.viewBtn")} <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── COMPACT LIST VIEW ─── */
          <div
            className="rounded-2xl border overflow-hidden divide-y divide-slate-100 dark:divide-white/5"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            {filteredAssignments.map((assignment) => {
              const isOverdue = new Date(assignment.deadline) < new Date();
              const isActionBusy = actionLoadingId === assignment.id;
              const totalEnrolled = assignment.totalStudents || 0;
              const submitted = assignment.submittedCount || 0;
              const graded = assignment.gradedCount || 0;

              return (
                <div
                  key={assignment.id}
                  className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {assignment.isPublished ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-500/10">
                          Draft
                        </span>
                      )}
                      {assignment.batchName && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10">
                          {assignment.batchName}
                        </span>
                      )}
                      {isOverdue && assignment.isPublished && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600">
                          Overdue
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm truncate" style={{ color: "var(--color-text)" }}>
                      {assignment.title}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>Due: {new Date(assignment.deadline).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{assignment.maxMarks} Marks</span>
                      {assignment.isPublished && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {submitted + graded}/{totalEnrolled} Submitted
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <Link
                      href={`/tutor/assignments/${assignment.id}`}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl text-white transition-all shadow-sm"
                      style={{ background: "var(--color-primary)" }}
                    >
                      {t("assignments.viewBtn")}
                    </Link>

                    <button
                      onClick={() => {
                        setEditingAssignment(assignment);
                        setEditFile(null);
                        setEditError("");
                      }}
                      className="p-1.5 rounded-lg border text-slate-400 hover:text-slate-600"
                      style={{ borderColor: "var(--color-border)" }}
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(assignment.id)}
                      disabled={isActionBusy}
                      className="p-1.5 rounded-lg border text-slate-400 hover:text-red-600"
                      style={{ borderColor: "var(--color-border)" }}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── CREATE ASSIGNMENT MODAL (SPACIOUS & EXPANDABLE EDITOR) ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-2xl sm:max-w-3xl rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[94vh] overflow-y-auto"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                  <Plus className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  {t("assignments.createAssignment")}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Create homework, problem sets, or structured assignments for your students
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div
                className="p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2"
                style={{ background: "rgba(239,68,68,0.08)", color: "var(--color-error)" }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {createError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateSubmit(false);
              }}
              className="space-y-4"
            >
              {/* Title */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--color-text)" }}>
                  {t("assignments.titleLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  placeholder="e.g. Physics: Static Electricity Question Set"
                />
              </div>

              {/* Target Batch, Max Marks & Deadline (3-column grid on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Target Batch */}
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--color-text)" }}>
                    {t("assignments.targetBatchLabel")}
                  </label>
                  <select
                    required
                    value={formData.batchId}
                    onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm outline-none"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    <option value="" disabled>
                      {t("assignments.selectBatch")}
                    </option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.subject ? `(${b.subject})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Max Marks */}
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--color-text)" }}>
                    {t("assignments.maxMarksLabel")}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.maxMarks}
                    onChange={(e) => setFormData({ ...formData, maxMarks: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm outline-none"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>

                {/* Deadline */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                      {t("assignments.deadlineLabel")}
                    </label>
                    <div className="flex gap-1 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setQuickDeadline(24)}
                        className="px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/10"
                        style={{ color: "var(--color-primary)" }}
                      >
                        +1d
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDeadline(72)}
                        className="px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/10"
                        style={{ color: "var(--color-primary)" }}
                      >
                        +3d
                      </button>
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm outline-none"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
              </div>

              {/* 🌟 Spacious Description & Topics Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                    {t("assignments.descLabel")}
                  </label>

                  {/* Formatting Shortcuts */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => insertFormatting(false, "• ")}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      <ListPlus className="w-3 h-3" /> + Add Topic Bullet
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting(false, "### Main Topics / Questions:\n1. ")}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      <Heading className="w-3 h-3" /> + Section Header
                    </button>
                  </div>
                </div>

                <textarea
                  ref={createTextareaRef}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3.5 rounded-2xl text-xs sm:text-sm outline-none leading-relaxed transition-all resize-y"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    minHeight: "180px",
                  }}
                  placeholder={"Write homework instructions, questions, or chapter topics here...\n\nExample:\n• Read Chapter 10 Pages 140-155\n• Solve MCQ questions 1 to 20\n• Submit handwritten math solutions as PDF"}
                  rows={8}
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 px-1">
                  <span>Tip: You can drag the bottom-right corner of this box to make it even larger.</span>
                  <span>{formData.description.length} characters</span>
                </div>
              </div>

              {/* Question Paper Attachment */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--color-text)" }}>
                  {t("assignments.questionAttachment")}
                </label>
                {!attachedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-2xl p-3.5 text-center cursor-pointer transition-colors hover:border-indigo-400 hover:bg-indigo-50/10"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <Paperclip className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--color-primary)" }} />
                    <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                      Upload Question Paper / Worksheet / PDF
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      PDF, JPG, PNG, or DOCX (Max 25MB)
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAttachedFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-between p-3 rounded-2xl border"
                    style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold truncate" style={{ color: "var(--color-text)" }}>
                        {attachedFile.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm rounded-2xl border transition-all active:scale-95 disabled:opacity-60"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  {t("assignments.createDraft")}
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateSubmit(true)}
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm rounded-2xl text-white transition-all active:scale-95 shadow-md disabled:opacity-60"
                  style={{ background: "var(--color-primary)" }}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  {t("assignments.publishImmediately")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT ASSIGNMENT MODAL (SPACIOUS & EXPANDABLE EDITOR) ─── */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-2xl sm:max-w-3xl rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[94vh] overflow-y-auto"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                  <Edit className="w-5 h-5 text-indigo-500" />
                  {t("assignments.editAssignment")}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Modify assignment title, deadline, topics, and question sheet
                </p>
              </div>
              <button
                onClick={() => setEditingAssignment(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div
                className="p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2"
                style={{ background: "rgba(239,68,68,0.08)", color: "var(--color-error)" }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateAssignment} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--color-text)" }}>
                  {t("assignments.titleLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={editingAssignment.title}
                  onChange={(e) =>
                    setEditingAssignment({ ...editingAssignment, title: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              {/* Target Batch, Max Marks & Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--color-text)" }}>
                    {t("assignments.targetBatchLabel")}
                  </label>
                  <select
                    required
                    value={editingAssignment.batchId}
                    onChange={(e) =>
                      setEditingAssignment({ ...editingAssignment, batchId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm outline-none"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.subject ? `(${b.subject})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--color-text)" }}>
                    {t("assignments.maxMarksLabel")}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingAssignment.maxMarks}
                    onChange={(e) =>
                      setEditingAssignment({
                        ...editingAssignment,
                        maxMarks: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm outline-none"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                      {t("assignments.deadlineLabel")}
                    </label>
                    <div className="flex gap-1 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setEditQuickDeadline(24)}
                        className="px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/10"
                        style={{ color: "var(--color-primary)" }}
                      >
                        +1d
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditQuickDeadline(72)}
                        className="px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/10"
                        style={{ color: "var(--color-primary)" }}
                      >
                        +3d
                      </button>
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    value={
                      editingAssignment.deadline
                        ? new Date(editingAssignment.deadline).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setEditingAssignment({ ...editingAssignment, deadline: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm outline-none"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
              </div>

              {/* 🌟 Spacious Description & Topics Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                    {t("assignments.descLabel")}
                  </label>

                  {/* Formatting Shortcuts */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => insertFormatting(true, "• ")}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      <ListPlus className="w-3 h-3" /> + Add Topic Bullet
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting(true, "### Main Topics / Questions:\n1. ")}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      <Heading className="w-3 h-3" /> + Section Header
                    </button>
                  </div>
                </div>

                <textarea
                  ref={editTextareaRef}
                  value={editingAssignment.description || ""}
                  onChange={(e) =>
                    setEditingAssignment({ ...editingAssignment, description: e.target.value })
                  }
                  className="w-full p-3.5 rounded-2xl text-xs sm:text-sm outline-none leading-relaxed transition-all resize-y"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    minHeight: "180px",
                  }}
                  rows={8}
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 px-1">
                  <span>Tip: You can drag the bottom-right corner of this box to make it even larger.</span>
                  <span>{(editingAssignment.description || "").length} characters</span>
                </div>
              </div>

              {/* Attachment Management */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--color-text)" }}>
                  {t("assignments.questionAttachment")}
                </label>
                {editingAssignment.filePath && !editFile && (
                  <div
                    className="flex items-center justify-between p-3 rounded-2xl border mb-2"
                    style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" /> Current Question File Attached
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingAssignment({ ...editingAssignment, filePath: null })}
                      className="text-xs text-red-500 font-bold hover:underline"
                    >
                      Remove File
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  ref={editFileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEditFile(e.target.files[0]);
                    }
                  }}
                />

                {editFile ? (
                  <div
                    className="flex items-center justify-between p-3 rounded-2xl border"
                    style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
                  >
                    <span className="text-xs font-bold truncate" style={{ color: "var(--color-text)" }}>
                      {editFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditFile(null)}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 text-xs font-bold rounded-2xl border border-dashed hover:border-indigo-400 transition-colors"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                  >
                    + Upload / Replace Question File
                  </button>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="flex-1 py-3 font-bold text-xs sm:text-sm rounded-2xl border"
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
                  disabled={isUpdating}
                  className="flex-1 py-3 font-bold text-xs sm:text-sm rounded-2xl text-white transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "var(--color-primary)" }}
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t("assignments.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
