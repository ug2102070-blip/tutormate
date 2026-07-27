"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatBDT } from "@/lib/utils";
import type { BatchDoc } from "@/types";
import { Plus, Users, Calendar, Archive, CheckCircle } from "lucide-react";
import { toggleArchiveBatch } from "@/actions/batchActions";

export default function BatchesPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadBatches() {
      const { data } = await supabase
        .from("batches")
        .select("*");

      if (data) {
        setBatches(
          data.map((b) => ({
            id: b.id,
            tutorId: b.tutor_id,
            name: b.name,
            subject: b.subject,
            gradeClass: b.grade_class,
            monthlyFee: Number(b.monthly_fee),
            schedule: b.schedule || [],
            studentCount: b.student_count,
            isArchived: b.is_archived,
            createdAt: b.created_at,
          }))
        );
      }
      setLoading(false);
    }

    loadBatches();
  }, [user]);

  const filteredBatches = batches.filter((b) =>
    tab === "active" ? !b.isArchived : b.isArchived
  );

  async function handleToggleArchive(batchId: string) {
    if (!user) return;
    await toggleArchiveBatch(batchId, user.id);
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, isArchived: !b.isArchived } : b))
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Batches & Classes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Manage your teaching batches, schedules, and monthly fees
          </p>
        </div>

        <Link
          href="/tutor/batches/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" /> Create New Batch
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
          Active Batches ({batches.filter((b) => !b.isArchived).length})
        </button>
        <button
          onClick={() => setTab("archived")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            tab === "archived"
              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          Archived ({batches.filter((b) => b.isArchived).length})
        </button>
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e1e2e]"
            />
          ))}
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e1e2e] shadow-xs">
          <Users className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No {tab} batches found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto font-medium">
            {tab === "active"
              ? "Create your first batch to start adding students and taking daily attendance."
              : "No archived batches available."}
          </p>
          {tab === "active" && (
            <Link
              href="/tutor/batches/new"
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-indigo-600 hover:underline"
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
              className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e1e2e] flex flex-col justify-between transition-all duration-200 hover:shadow-md shadow-xs"
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
                        Class {batch.gradeClass}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600 shrink-0">
                    {formatBDT(batch.monthlyFee)}/mo
                  </span>
                </div>

                {/* Schedule preview */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Class Schedule:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {batch.schedule?.map((s, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-1 rounded-lg font-semibold bg-slate-50 dark:bg-[#13131f] text-slate-700 dark:text-slate-300 border border-slate-200/60"
                      >
                        {s.day}: {s.time}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  {batch.studentCount || 0} enrolled students
                </span>

                <button
                  onClick={() => handleToggleArchive(batch.id)}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                >
                  {batch.isArchived ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Unarchive
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
