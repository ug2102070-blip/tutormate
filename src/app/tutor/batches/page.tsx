"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { formatBDT } from "@/lib/utils";
import type { BatchDoc } from "@/types";
import { Plus, Users, Calendar, Archive, CheckCircle } from "lucide-react";
import { toggleArchiveBatch } from "@/actions/batchActions";

export default function BatchesPage() {
  const { user, claims } = useAuth();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || claims?.role !== "tutor") return;

    const q = query(
      collection(db, "batches"),
      where("tutorId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: BatchDoc[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as BatchDoc);
      });
      setBatches(list);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, claims]);

  const filteredBatches = batches.filter((b) =>
    tab === "active" ? !b.isArchived : b.isArchived
  );

  async function handleToggleArchive(batchId: string) {
    if (!user) return;
    const token = await user.getIdToken();
    await toggleArchiveBatch(batchId, token);
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Batches & Classes
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage your teaching batches, schedules, and monthly fees
          </p>
        </div>

        <Link
          href="/tutor/batches/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
          }}
        >
          <Plus className="w-4 h-4" /> Create New Batch
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)] pb-2">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            tab === "active"
              ? "bg-[var(--color-primary-50)] text-[var(--color-primary-dark)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          Active Batches ({batches.filter((b) => !b.isArchived).length})
        </button>
        <button
          onClick={() => setTab("archived")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            tab === "archived"
              ? "bg-[var(--color-primary-50)] text-[var(--color-primary-dark)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          Archived ({batches.filter((b) => b.isArchived).length})
        </button>
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl animate-shimmer border border-[var(--color-border)]"
            />
          ))}
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)]">
          <Users className="w-10 h-10 mx-auto text-[var(--color-text-muted)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text)]">
            No {tab} batches found
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            {tab === "active"
              ? "Create your first batch to start adding students and taking daily attendance."
              : "No archived batches available."}
          </p>
          {tab === "active" && (
            <Link
              href="/tutor/batches/new"
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Create a batch now
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="p-5 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col justify-between transition-all duration-200 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text)]">
                      {batch.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                        {batch.subject}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                        Class {batch.gradeClass}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[var(--color-success)]">
                    {formatBDT(batch.monthlyFee)}/mo
                  </span>
                </div>

                {/* Schedule preview */}
                <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-1">
                  <div className="text-[11px] font-medium text-[var(--color-text-muted)] flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Class Schedule:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {batch.schedule?.map((s, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                      >
                        {s.day}: {s.time}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  {batch.studentCount || 0} enrolled students
                </span>

                <button
                  onClick={() => handleToggleArchive(batch.id)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors flex items-center gap-1"
                >
                  {batch.isArchived ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
