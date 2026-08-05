"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Megaphone, Plus, Send, Trash2, Calendar, Clock,
  CheckCircle2, Loader2, AlertCircle, Building2,
  Pin, PinOff, Pencil, X, Users,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  getTutorNotices, createTutorNotice, updateTutorNotice,
  deleteTutorNotice, togglePinTutorNotice,
  getCenterNoticesForTutor, type TutorNotice, type CenterNotice,
} from "@/actions/noticeActions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  if (/^\d{2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  }
  return t;
}

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString();
}

const MY_TARGET_LABELS: Record<TutorNotice["target"], string> = {
  all: "Everyone",
  students: "Students Only",
  parents: "Parents Only",
};

const MY_TARGET_COLORS: Record<TutorNotice["target"], { bg: string; text: string; border: string }> = {
  all: { bg: "rgba(99,102,241,0.1)", text: "#6366f1", border: "rgba(99,102,241,0.2)" },
  students: { bg: "rgba(16,185,129,0.1)", text: "#059669", border: "rgba(16,185,129,0.2)" },
  parents: { bg: "rgba(168,85,247,0.1)", text: "#9333ea", border: "rgba(168,85,247,0.2)" },
};

const CENTER_TARGET_LABELS: Record<CenterNotice["target"], string> = {
  everyone: "Entire Center",
  tutors: "Tutors Only",
  students: "Students Only",
};

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  message, onConfirm, onCancel, loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-rose-500/10">
            <Trash2 className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Confirm Delete</h3>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{message}</p>
          </div>
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notice Form Modal ────────────────────────────────────────────────────────

function NoticeFormModal({
  mode, initial, onClose, onSubmit, submitting,
}: {
  mode: "create" | "edit";
  initial?: TutorNotice;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  submitting: boolean;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = new Date().toTimeString().slice(0, 5);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [target, setTarget] = useState<TutorNotice["target"]>(initial?.target ?? "all");
  const [noticeDate, setNoticeDate] = useState(initial?.noticeDate ?? todayStr);
  const [noticeTime, setNoticeTime] = useState(initial?.noticeTime ?? nowTimeStr);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    fd.append("content", content);
    fd.append("target", target);
    fd.append("noticeDate", noticeDate || todayStr);
    fd.append("noticeTime", noticeTime || "09:00");
    await onSubmit(fd);
  }

  const inputStyle = {
    background: "var(--color-bg-secondary)",
    borderColor: "var(--color-border)",
    color: "var(--color-text)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <Megaphone className="w-5 h-5 text-indigo-500" />
            {mode === "create" ? "Publish Announcement" : "Edit Announcement"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Notice Title *
              </label>
              <span className={`text-[10px] font-medium ${title.length > 180 ? "text-rose-500" : "text-gray-400"}`}>
                {title.length}/200
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="e.g. Class Schedule Change"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              style={inputStyle}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Event Date
              </label>
              <input
                type="date"
                required
                value={noticeDate}
                onChange={(e) => setNoticeDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> Event Time
              </label>
              <input
                type="time"
                required
                value={noticeTime}
                onChange={(e) => setNoticeTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
              <Users className="w-3.5 h-3.5 text-indigo-500" /> Target Audience
            </label>
            <div className="flex gap-2">
              {(["all", "students", "parents"] as const).map((t) => {
                const c = MY_TARGET_COLORS[t];
                const isActive = target === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTarget(t)}
                    className="flex-1 py-2 text-[11px] font-bold rounded-xl border transition-all"
                    style={{
                      background: isActive ? c.bg : "transparent",
                      color: isActive ? c.text : "var(--color-text-muted)",
                      borderColor: isActive ? c.border : "var(--color-border)",
                    }}
                  >
                    {MY_TARGET_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Notice Description *
              </label>
              <span className={`text-[10px] font-medium ${content.length > 1800 ? "text-rose-500" : "text-gray-400"}`}>
                {content.length}/2000
              </span>
            </div>
            <textarea
              required
              rows={4}
              maxLength={2000}
              placeholder="Write notice details here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border outline-none resize-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              style={inputStyle}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border transition-colors"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-60 transition-all active:scale-95"
              style={{ background: "var(--color-primary)" }}
            >
              {submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
              ) : mode === "create" ? (
                <><Send className="w-3.5 h-3.5" /> Publish Now</>
              ) : (
                <><Pencil className="w-3.5 h-3.5" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TutorNoticesPage() {
  const [notices, setNotices] = useState<TutorNotice[]>([]);
  const [centerNotices, setCenterNotices] = useState<CenterNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<TutorNotice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pin loading
  const [pinningId, setPinningId] = useState<string | null>(null);

  const loadNotices = useCallback(async () => {
    try {
      setLoading(true);
      const [myNotices, centerData] = await Promise.all([
        getTutorNotices(),
        getCenterNoticesForTutor(),
      ]);
      setNotices(myNotices);
      setCenterNotices(centerData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  }

  function sortNotices(list: TutorNotice[]): TutorNotice[] {
    return [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // Create
  async function handleCreate(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      const newNotice = await createTutorNotice(formData);
      setNotices((prev) => sortNotices([newNotice, ...prev]));
      setShowForm(false);
      showSuccess("Notice published and sent to students/parents!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish notice.");
    } finally {
      setSubmitting(false);
    }
  }

  // Edit
  async function handleEdit(formData: FormData) {
    if (!editingNotice) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateTutorNotice(editingNotice.id, formData);
      setNotices((prev) => sortNotices(prev.map((n) => (n.id === updated.id ? updated : n))));
      setEditingNotice(null);
      showSuccess("Notice updated successfully!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update notice.");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTutorNotice(deleteTarget);
      setNotices((prev) => prev.filter((n) => n.id !== deleteTarget));
      setDeleteTarget(null);
      showSuccess("Notice deleted.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete notice.");
    } finally {
      setDeleting(false);
    }
  }

  // Pin
  async function handleTogglePin(notice: TutorNotice) {
    setPinningId(notice.id);
    try {
      const updated = await togglePinTutorNotice(notice.id, notice.isPinned);
      setNotices((prev) => sortNotices(prev.map((n) => (n.id === updated.id ? updated : n))));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update pin.");
    } finally {
      setPinningId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <Megaphone className="w-6 h-6 text-indigo-500" /> Notice Board
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Broadcast announcements to your students and parents · {notices.length} notice{notices.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setEditingNotice(null); setShowForm(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 shrink-0"
          style={{ background: "var(--color-primary)" }}
        >
          <Plus className="w-4 h-4" /> Create Notice
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Center Notices (read-only, from Owner) ── */}
          {centerNotices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: "rgb(217,119,6)" }}>
                  <Building2 className="w-3.5 h-3.5" /> From Coaching Center
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(245,158,11,0.1)", color: "rgb(217,119,6)" }}>
                  {centerNotices.length}
                </span>
              </div>

              {centerNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="p-4 rounded-2xl border space-y-2 relative overflow-hidden"
                  style={{
                    background: notice.isPinned
                      ? "linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(180,83,9,0.03) 100%)"
                      : "rgba(245,158,11,0.04)",
                    borderColor: notice.isPinned ? "rgba(245,158,11,0.4)" : "rgba(245,158,11,0.2)",
                  }}
                >
                  {notice.isPinned && (
                    <div
                      className="absolute top-0 right-0 px-2.5 py-1 text-[10px] font-bold rounded-bl-xl flex items-center gap-1"
                      style={{ background: "rgba(245,158,11,0.15)", color: "rgb(217,119,6)" }}
                    >
                      <Pin className="w-2.5 h-2.5" /> Pinned
                    </div>
                  )}
                  <div className="flex items-start gap-2 flex-wrap pr-14">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">
                      Center Broadcast
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 capitalize">
                      {CENTER_TARGET_LABELS[notice.target] ?? notice.target}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{notice.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{notice.content}</p>
                  <div className="flex items-center justify-between gap-3 text-[11px] text-amber-600 font-semibold pt-1 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {notice.noticeDate}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(notice.noticeTime)}</span>
                    </div>
                    <span style={{ color: "var(--color-text-muted)" }}>{relativeTime(notice.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── My Notices ── */}
          <div className="space-y-3">
            {centerNotices.length > 0 && (
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: "var(--color-text-muted)" }}>
                  <Megaphone className="w-3.5 h-3.5" /> My Notices
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-muted)" }}>
                  {notices.length}
                </span>
              </div>
            )}

            {notices.length === 0 ? (
              <EmptyState
                variant="notices"
                title="No notices published yet"
                description="Create an announcement to notify students or parents."
                action={{ label: "Create Notice", onClick: () => setShowForm(true) }}
              />
            ) : (
              notices.map((notice) => {
                const colors = MY_TARGET_COLORS[notice.target];
                return (
                  <div
                    key={notice.id}
                    className="group p-5 rounded-2xl border transition-all hover:shadow-md space-y-3 relative overflow-hidden"
                    style={{
                      background: notice.isPinned
                        ? "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(79,70,229,0.02) 100%)"
                        : "var(--color-surface)",
                      borderColor: notice.isPinned ? "rgba(99,102,241,0.3)" : "var(--color-border)",
                    }}
                  >
                    {/* Pinned badge */}
                    {notice.isPinned && (
                      <div
                        className="absolute top-0 right-0 px-2.5 py-1 text-[10px] font-bold rounded-bl-xl flex items-center gap-1"
                        style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}
                      >
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </div>
                    )}

                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 pr-10">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                            style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
                          >
                            {MY_TARGET_LABELS[notice.target]}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold truncate" style={{ color: "var(--color-text)" }}>
                          {notice.title}
                        </h3>
                      </div>

                      {/* Action buttons — reveal on hover */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleTogglePin(notice)}
                          disabled={pinningId === notice.id}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: notice.isPinned ? "#6366f1" : "var(--color-text-muted)" }}
                          title={notice.isPinned ? "Unpin" : "Pin notice"}
                        >
                          {pinningId === notice.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : notice.isPinned ? (
                            <PinOff className="w-4 h-4" />
                          ) : (
                            <Pin className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => { setEditingNotice(notice); setShowForm(false); }}
                          className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                          title="Edit notice"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(notice.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete notice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {notice.content}
                    </p>

                    {/* Footer */}
                    <div
                      className="pt-2 border-t flex items-center justify-between text-[11px] flex-wrap gap-2"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--color-primary)" }}>
                          <Calendar className="w-3.5 h-3.5" /> {notice.noticeDate}
                        </span>
                        <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--color-primary)" }}>
                          <Clock className="w-3.5 h-3.5" /> {formatTime(notice.noticeTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sent to feeds
                        </span>
                        <span>
                          {relativeTime(notice.createdAt)}
                          {notice.updatedAt !== notice.createdAt && " · edited"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <NoticeFormModal
          mode="create"
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
          submitting={submitting}
        />
      )}

      {/* Edit Modal */}
      {editingNotice && (
        <NoticeFormModal
          mode="edit"
          initial={editingNotice}
          onClose={() => setEditingNotice(null)}
          onSubmit={handleEdit}
          submitting={submitting}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <ConfirmModal
          message="This notice will be permanently deleted."
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

