"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getParentAssignments } from "@/actions/parentActions";
import { FileText, Loader2, Clock, CheckCircle2, Star } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pending", color: "var(--color-warning, #d97706)", bg: "var(--color-warning-bg, #fffbeb)", icon: Clock },
  submitted: { label: "Submitted", color: "var(--color-primary)", bg: "var(--color-primary-50)", icon: CheckCircle2 },
  graded: { label: "Graded", color: "var(--color-success, #16a34a)", bg: "var(--color-success-bg, #f0fdf4)", icon: Star },
  late: { label: "Late", color: "var(--color-error, #dc2626)", bg: "var(--color-error-bg, #fef2f2)", icon: Clock },
};

export default function ParentAssignmentsPage() {
  const supabase = createClient();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "graded" | "late">("all");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await getParentAssignments();
      setAssignments(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter === "all" ? assignments : assignments.filter((a) => a.status === filter);

  const counts = {
    all: assignments.length,
    pending: assignments.filter((a) => a.status === "pending").length,
    submitted: assignments.filter((a) => a.status === "submitted").length,
    graded: assignments.filter((a) => a.status === "graded").length,
    late: assignments.filter((a) => a.status === "late").length,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, var(--color-primary)) 100%)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)" }}>
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Assignments</h1>
            <p className="text-xs text-white/70">Track your child's assignment progress</p>
          </div>
        </div>

        {!loading && (
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: `All (${counts.all})` },
              { key: "pending", label: `Pending (${counts.pending})` },
              { key: "graded", label: `Graded (${counts.graded})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as any)}
                className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                style={{
                  background: filter === f.key ? "#fff" : "rgba(255,255,255,0.2)",
                  color: filter === f.key ? "var(--color-primary)" : "#fff",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
          No assignments found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending;
            const Icon = sc.icon;
            const isOverdue = a.status === "pending" && a.assignment.deadline
              && new Date(a.assignment.deadline) < new Date();

            return (
              <div
                key={a.id}
                className="rounded-2xl p-4"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderLeft: `3px solid ${sc.color}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: sc.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: sc.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                        {a.assignment.title}
                      </p>
                      <span
                        className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {sc.label}
                      </span>
                    </div>

                    {a.assignment.description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
                        {a.assignment.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-2">
                      {a.assignment.deadline && (
                        <p
                          className="text-[11px] font-medium flex items-center gap-1"
                          style={{ color: isOverdue ? "var(--color-error, #dc2626)" : "var(--color-text-muted)" }}
                        >
                          <Clock className="w-3 h-3" />
                          Due {new Date(a.assignment.deadline).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                          {isOverdue && " (Overdue)"}
                        </p>
                      )}

                      {a.status === "graded" && a.marksObtained !== null && (
                        <p className="text-[11px] font-bold" style={{ color: "var(--color-success, #16a34a)" }}>
                          Score: {a.marksObtained} / {a.assignment.maxMarks}
                        </p>
                      )}

                      {a.submittedAt && (
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          Submitted {new Date(a.submittedAt).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>

                    {a.feedback && (
                      <div
                        className="mt-2 p-2 rounded-lg text-xs italic"
                        style={{
                          background: "var(--color-bg-secondary)",
                          color: "var(--color-text-secondary)",
                          borderLeft: "2px solid var(--color-primary-100)",
                        }}
                      >
                        Tutor feedback: "{a.feedback}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
