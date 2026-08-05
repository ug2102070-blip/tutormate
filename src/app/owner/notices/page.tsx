"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, Plus, Send, Trash2, Calendar, Clock,
  CheckCircle2, Loader2, AlertCircle, Pin, PinOff,
  Pencil, X, Users,
} from "lucide-react";
import {
  getCenterNotices, createCenterNotice, updateCenterNotice,
  deleteCenterNotice, togglePinCenterNotice, type CenterNotice,
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

const TARGET_LABELS: Record<CenterNotice["target"], string> = {
  everyone: "Entire Center",
  tutors: "Tutors Only",
  students: "Students Only",
};

const TARGET_COLORS: Record<CenterNotice["target"], { bg: string; text: string; border: string }> = {
  everyone: { bg: "rgba(99,102,241,0.1)", text: "#6366f1", border: "rgba(99,102,241,0.2)" },
  tutors: { bg: "rgba(245,158,11,0.1)", text: "rgb(217,119,6)", border: "rgba(245,158,11,0.2)" },
  students: { bg: "rgba(16,185,129,0.1)", text: "#059669", border: "rgba(16,185,129,0.2)" },
};

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  loading,
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
            <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Confirm Delete
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              {message}
            </p>
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
  mode,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  mode: "create" | "edit";
  initial?: CenterNotice;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  submitting: boolean;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = new Date().toTimeString().slice(0, 5);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [target, setTarget] = useState<CenterNotice["target"]>(initial?.target ?? "everyone");
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
            <Building2 className="w-5 h-5 text-amber-500" />
            {mode === "create" ? "Publish Center Announcement" : "Edit Announcement"}
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
                Announcement Title *
              </label>
              <span className={`text-[10px] font-medium ${title.length > 180 ? "text-rose-500" : "text-gray-400"}`}>
                {title.length}/200
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="e.g. Annual Holiday Notice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
              style={inputStyle}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                <Calendar className="w-3.5 h-3.5 text-amber-500" /> Event Date
              </label>
              <input
                type="date"
                required
                value={noticeDate}
                onChange={(e) => setNoticeDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Event Time
              </label>
              <input
                type="time"
                required
                value={noticeTime}
                onChange={(e) => setNoticeTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
              <Users className="w-3.5 h-3.5 text-amber-500" /> Target Audience
            </label>
            <div className="flex gap-2">
              {(["everyone", "tutors", "students"] as const).map((t) => {
                const c = TARGET_COLORS[t];
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
                    {TARGET_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Announcement Content *
              </label>
              <span className={`text-[10px] font-medium ${content.length > 1800 ? "text-rose-500" : "text-gray-400"}`}>
                {content.length}/2000
              </span>
            </div>
            <textarea
              required
              rows={4}
              maxLength={2000}
              placeholder="Write center announcement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border outline-none resize-none focus:ring-2 focus:ring-amber-500/30 transition-all"
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
              style={{ background: "linear-gradient(135deg, rgb(217,119,6) 0%, rgb(180,83,9) 100%)" }}
            >
              {submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
              ) : mode === "create" ? (
                <><Send className="w-3.5 h-3.5" /> Publish</>
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

type FilterTab = "all" | "everyone" | "tutors" | "students";

export default function OwnerNoticesPage() {
  const [notices, setNotices] = useState<CenterNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<CenterNotice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Confirm delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pin loading
  const [pinningId, setPinningId] = useState<string | null>(null);

  // Filter
  const [filter, setFilter] = useState<FilterTab>("all");

  const loadNotices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCenterNotices();
      setNotices(data);
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

  // Create
  async function handleCreate(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      const newNotice = await createCenterNotice(formData);
      setNotices((prev) => {
        const updated = [newNotice, ...prev];
        return sortNotices(updated);
      });
      setShowForm(false);
      showSuccess("Notice published and broadcasted successfully!");
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
      const updated = await updateCenterNotice(editingNotice.id, formData);
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
      await deleteCenterNotice(deleteTarget);
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
  async function handleTogglePin(notice: CenterNotice) {
    setPinningId(notice.id);
    try {
      const updated = await togglePinCenterNotice(notice.id, notice.isPinned);
      setNotices((prev) => sortNotices(prev.map((n) => (n.id === updated.id ? updated : n))));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update pin.");
    } finally {
      setPinningId(null);
    }
  }

  function sortNotices(list: CenterNotice[]): CenterNotice[] {
    return [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  const filteredNotices = filter === "all"
    ? notices
    : notices.filter((n) => n.target === filter);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "everyone", label: "Everyone" },
    { key: "tutors", label: "Tutors" },
    { key: "students", label: "Students" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <Building2 className="w-6 h-6 text-amber-500" /> Center Notice Board
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Broadcast institution-wide announcements · {notices.length} total
          </p>
        </div>
        <button
          onClick={() => { setEditingNotice(null); setShowForm(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 shrink-0"
          style={{ background: "linear-gradient(135deg, rgb(217,119,6) 0%, rgb(180,83,9) 100%)" }}
        >
          <Plus className="w-4 h-4" /> Publish Notice
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

      {/* Filter Tabs */}
      {notices.length > 0 && (
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--color-bg-secondary)" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all"
              style={{
                background: filter === tab.key ? "var(--color-surface)" : "transparent",
                color: filter === tab.key ? "var(--color-text)" : "var(--color-text-muted)",
                boxShadow: filter === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {tab.label}
              {tab.key !== "all" && (
                <span className="ml-1 text-[9px] opacity-60">
                  ({notices.filter((n) => n.target === tab.key).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Notice List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgb(245,158,11)" }} />
        </div>
      ) : filteredNotices.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-52 gap-3 rounded-2xl border"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-border)", borderStyle: "dashed" }}
        >
          <Building2 className="w-10 h-10 text-amber-400 opacity-40" />
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {filter === "all" ? "No notices published yet" : `No notices for "${TARGET_LABELS[filter as CenterNotice["target"]] ?? filter}"`}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Create an announcement to notify your coaching center members
          </p>
          <button
            onClick={() => { setShowForm(true); }}
            className="mt-1 px-4 py-2 text-xs font-bold text-white rounded-xl"
            style={{ background: "rgb(217,119,6)" }}
          >
            + Publish Notice
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotices.map((notice) => {
            const colors = TARGET_COLORS[notice.target];
            return (
              <div
                key={notice.id}
                className="group p-5 rounded-2xl border transition-all hover:shadow-md space-y-3 relative overflow-hidden"
                style={{
                  background: notice.isPinned
                    ? "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(180,83,9,0.03) 100%)"
                    : "var(--color-surface)",
                  borderColor: notice.isPinned ? "rgba(245,158,11,0.35)" : "var(--color-border)",
                }}
              >
                {/* Pinned badge */}
                {notice.isPinned && (
                  <div
                    className="absolute top-0 right-0 px-2.5 py-1 text-[10px] font-bold rounded-bl-xl flex items-center gap-1"
                    style={{ background: "rgba(245,158,11,0.15)", color: "rgb(217,119,6)" }}
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
                        {TARGET_LABELS[notice.target]}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold truncate" style={{ color: "var(--color-text)" }}>
                      {notice.title}
                    </h3>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Pin toggle */}
                    <button
                      onClick={() => handleTogglePin(notice)}
                      disabled={pinningId === notice.id}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: notice.isPinned ? "rgb(217,119,6)" : "var(--color-text-muted)" }}
                      title={notice.isPinned ? "Unpin notice" : "Pin notice"}
                    >
                      {pinningId === notice.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : notice.isPinned ? (
                        <PinOff className="w-4 h-4" />
                      ) : (
                        <Pin className="w-4 h-4" />
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => { setEditingNotice(notice); setShowForm(false); }}
                      className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                      title="Edit notice"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
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
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <Calendar className="w-3.5 h-3.5" /> {notice.noticeDate}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <Clock className="w-3.5 h-3.5" /> {formatTime(notice.noticeTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Broadcasted
                    </span>
                    <span style={{ color: "var(--color-text-muted)" }}>
                      {relativeTime(notice.createdAt)}
                      {notice.updatedAt !== notice.createdAt && " · edited"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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
          message="This notice will be permanently deleted and removed from all portals."
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}