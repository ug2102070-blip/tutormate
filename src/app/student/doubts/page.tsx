"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { createDoubt } from "@/actions/doubtActions";
import type { DoubtDoc, BatchDoc } from "@/types";
import { Plus, HelpCircle, MessageSquare, Image as ImageIcon, X } from "lucide-react";

export default function StudentDoubtsPage() {
  const { user, claims } = useAuth();
  const [doubts, setDoubts] = useState<DoubtDoc[]>([]);
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [initialQuestion, setInitialQuestion] = useState("");
  const [batchId, setBatchId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || claims?.role !== "student") return;

    // Load student's doubts
    const q = query(
      collection(db, "doubts"),
      where("studentAuthUid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: DoubtDoc[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as DoubtDoc));
      // Sort by lastMessageAt desc
      list.sort((a, b) => b.lastMessageAt?.toMillis() - a.lastMessageAt?.toMillis());
      setDoubts(list);
      setLoading(false);
    });

    // Load student's enrolled batches for dropdown
    async function loadBatches() {
      if (!claims || claims.role !== "student") return;
      const bSnap = await getDocs(
        query(collection(db, "batches"), where("tutorId", "==", claims.tutorId))
      );
      const bList: BatchDoc[] = [];
      bSnap.forEach((d) => bList.push({ id: d.id, ...d.data() } as BatchDoc));
      setBatches(bList);
      if (bList.length > 0) setBatchId(bList[0].id);
    }
    loadBatches();

    return unsubscribe;
  }, [user, claims]);

  async function handleCreateDoubt(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !claims || claims.role !== "student") return;
    setError("");
    setSubmitting(true);

    try {
      let attachmentPath: string | null = null;

      // 1. Upload image if selected
      if (selectedFile) {
        const doubtTempId = `d_${Date.now()}`;
        const fileName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        // Path standard: doubts/{tutorId}/{studentAuthUid}/{doubtId}/{fileName}
        attachmentPath = `doubts/${claims.tutorId}/${user.uid}/${doubtTempId}/${fileName}`;

        const storageRef = ref(storage, attachmentPath);
        await uploadBytes(storageRef, selectedFile);
      }

      // 2. Create Doubt doc via Server Action
      const token = await user.getIdToken();
      await createDoubt(
        {
          title,
          initialQuestion,
          batchId,
          attachmentPath,
        },
        user.displayName || "Student",
        token
      );

      // Reset form
      setTitle("");
      setInitialQuestion("");
      setSelectedFile(null);
      setShowModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit doubt.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredDoubts = doubts.filter((d) =>
    statusFilter === "all" ? true : d.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Ask Your Teacher
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Ask questions directly to your tutor and receive instant threaded answers
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
          }}
        >
          <Plus className="w-4 h-4" /> Ask New Question
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)] pb-2">
        {["all", "pending", "answered", "resolved"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
              statusFilter === st
                ? "bg-[var(--color-primary-50)] text-[var(--color-primary-dark)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {st} ({doubts.filter((d) => (st === "all" ? true : d.status === st)).length})
          </button>
        ))}
      </div>

      {/* Doubts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl animate-shimmer border border-[var(--color-border)]"
            />
          ))}
        </div>
      ) : filteredDoubts.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)]">
          <HelpCircle className="w-10 h-10 mx-auto text-[var(--color-text-muted)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text)]">
            No questions found
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            Got a doubt from today&apos;s class? Click &quot;Ask New Question&quot; to send it to your tutor.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDoubts.map((doubt) => (
            <Link
              key={doubt.id}
              href={`/student/doubts/${doubt.id}`}
              className="block p-5 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all duration-200 shadow-xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--color-text)]">
                      {doubt.title}
                    </h3>
                    {doubt.unreadByStudent && (
                      <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                    {doubt.initialQuestion}
                  </p>
                </div>

                {/* Status Pill */}
                {doubt.status === "pending" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    Pending Answer
                  </span>
                )}
                {doubt.status === "answered" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    Answered
                  </span>
                )}
                {doubt.status === "resolved" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    Resolved
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> View Thread
                  </span>
                  {doubt.attachmentPath && (
                    <span className="flex items-center gap-1 text-[var(--color-primary)]">
                      <ImageIcon className="w-3.5 h-3.5" /> Has Image
                    </span>
                  )}
                </div>
                <span>
                  {doubt.createdAt
                    ? new Date(doubt.createdAt.toMillis()).toLocaleDateString()
                    : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Ask Question Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--color-text)]">
                Ask Your Teacher a Question
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div
                className="p-3 text-xs rounded-lg"
                style={{
                  backgroundColor: "rgb(239 68 68 / 0.1)",
                  color: "var(--color-error)",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleCreateDoubt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Select Batch
                </label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Question Title / Topic
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Physics Chapter 3 Calculus Problem"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Detailed Question
                </label>
                <textarea
                  required
                  rows={4}
                  value={initialQuestion}
                  onChange={(e) => setInitialQuestion(e.target.value)}
                  placeholder="Type your question or explain where you got stuck..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Attach Image (Problem photo / notes)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[var(--color-text-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-primary-50)] file:text-[var(--color-primary)] hover:file:opacity-90"
                />
              </div>

              <div className="pt-3 border-t border-[var(--color-border)] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title || !initialQuestion}
                  className="px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
