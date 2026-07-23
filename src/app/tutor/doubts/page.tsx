"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import type { DoubtDoc } from "@/types";
import { HelpCircle, MessageSquare, Image as ImageIcon, Search } from "lucide-react";

export default function TutorDoubtsPage() {
  const { user, claims } = useAuth();
  const [doubts, setDoubts] = useState<DoubtDoc[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || claims?.role !== "tutor") return;

    const q = query(
      collection(db, "doubts"),
      where("tutorId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: DoubtDoc[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as DoubtDoc));
      list.sort((a, b) => b.lastMessageAt?.toMillis() - a.lastMessageAt?.toMillis());
      setDoubts(list);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, claims]);

  const filteredDoubts = doubts.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.studentName.toLowerCase().includes(search.toLowerCase()) ||
      d.initialQuestion.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" ? true : d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = doubts.filter((d) => d.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Ask Your Teacher — Student Doubts
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Answer questions submitted by your batch students with images and threaded replies
          </p>
        </div>

        {pendingCount > 0 && (
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-xs">
            {pendingCount} Pending Answers
          </span>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or topic..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none"
          />
        </div>

        <div className="flex gap-1.5 self-start sm:self-auto">
          {["all", "pending", "answered", "resolved"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${
                statusFilter === st
                  ? "bg-[var(--color-primary-50)] text-[var(--color-primary-dark)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {st} ({doubts.filter((d) => (st === "all" ? true : d.status === st)).length})
            </button>
          ))}
        </div>
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
            No doubts found
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            {search || statusFilter !== "all"
              ? "No student doubts match your search filter."
              : "No questions have been submitted by students yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDoubts.map((doubt) => (
            <Link
              key={doubt.id}
              href={`/tutor/doubts/${doubt.id}`}
              className={`block p-5 rounded-2xl border bg-[var(--color-surface)] hover:border-[var(--color-primary)] transition-all duration-200 shadow-xs ${
                doubt.unreadByTutor
                  ? "border-[var(--color-primary-light)] bg-[var(--color-primary-50)]/30"
                  : "border-[var(--color-border)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-primary)]">
                      {doubt.studentName}
                    </span>
                    {doubt.unreadByTutor && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary)] text-white">
                        NEW REPLY
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-text)] mt-1">
                    {doubt.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                    {doubt.initialQuestion}
                  </p>
                </div>

                {/* Status Pills */}
                {doubt.status === "pending" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    Needs Answer
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
                    <MessageSquare className="w-3.5 h-3.5" /> Reply Thread
                  </span>
                  {doubt.attachmentPath && (
                    <span className="flex items-center gap-1 text-[var(--color-primary)]">
                      <ImageIcon className="w-3.5 h-3.5" /> Includes Photo
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
    </div>
  );
}
