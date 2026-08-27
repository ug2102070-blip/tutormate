"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { formatBDT } from "@/lib/utils";
import type { BatchDoc } from "@/types";
import { Plus, Users, Calendar, Archive, CheckCircle } from "lucide-react";
import { getTutorBatches, toggleArchiveBatch } from "@/actions/batchActions";
import { EmptyState } from "@/components/EmptyState";

export default function BatchesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<"active" | "archived">("active");

  // SWR: caches batches for 30s — instant on tab switch / back navigation
  const { data: batches = [], isLoading, mutate } = useSWR<BatchDoc[]>(
    user ? "tutor-batches" : null,
    () => getTutorBatches(),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const filteredBatches = batches.filter((b) =>
    tab === "active" ? !b.isArchived : b.isArchived
  );

  async function handleToggleArchive(batchId: string) {
    if (!user) return;
    // Optimistic update — UI changes instantly, no spinner needed
    mutate(
      batches.map((b) => (b.id === batchId ? { ...b, isArchived: !b.isArchived } : b)),
      false
    );
    await toggleArchiveBatch(batchId);
    mutate(); // revalidate from server
  }

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("batches.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {t("batches.subtitle")}
          </p>
        </div>

        <Link
          href="/tutor/batches/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" /> {t("batches.createNew")}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            tab === "active"
              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {t("batches.activeBatches")} ({batches.filter((b) => !b.isArchived).length})
        </button>
        <button
          onClick={() => setTab("archived")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            tab === "archived"
              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {t("batches.archivedBatches")} ({batches.filter((b) => b.isArchived).length})
        </button>
      </div>

      {/* Batches Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]"
            />
          ))}
        </div>
      ) : filteredBatches.length === 0 ? (
        <EmptyState
          variant="batches"
          title={tab === "active" ? t("batches.noActiveBatchesTitle") : t("batches.noArchivedBatchesTitle")}
          description={
            tab === "active"
              ? t("batches.noActiveDesc")
              : t("batches.noArchivedDesc")
          }
          action={
            tab === "active"
              ? { label: t("batches.createBatchBtn"), href: "/tutor/batches/new" }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] flex flex-col justify-between transition-all duration-200 hover:shadow-md shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {batch.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 dark:bg-[#252535] text-slate-700 dark:text-slate-300">
                        {batch.subject}
                      </span>
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 border border-indigo-100">
                        {t("batches.classPrefix")} {batch.gradeClass}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600 shrink-0">
                    {formatBDT(batch.monthlyFee)}/{t("batches.perMonth")}
                  </span>
                </div>

                {/* Schedule preview */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {t("batches.classSchedule")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {batch.schedule?.map((s, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-1 rounded-lg font-semibold bg-slate-50 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-300 border border-slate-200/60"
                      >
                        {s.day}: {s.time}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  {batch.studentCount || 0} {t("batches.enrolledStudents")}
                </span>

                <button
                  onClick={() => handleToggleArchive(batch.id)}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                >
                  {batch.isArchived ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {t("batches.unarchive")}
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" /> {t("batches.archive")}
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
