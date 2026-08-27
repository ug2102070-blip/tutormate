"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getParentExamResults } from "@/actions/parentActions";
import { Award, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const GRADE_COLORS: Record<string, { bg: string; color: string }> = {
  "A+": { bg: "#f0fdf4", color: "#15803d" },
  "A": { bg: "#f0fdf4", color: "#16a34a" },
  "B": { bg: "#eff6ff", color: "#2563eb" },
  "C": { bg: "#fefce8", color: "#ca8a04" },
  "D": { bg: "#fff7ed", color: "#ea580c" },
  "F": { bg: "#fef2f2", color: "#dc2626" },
};

export default function ParentResultsPage() {
  const supabase = createClient();
  const { t, language } = useLanguage();
  const isBn = language === "bn";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await getParentExamResults();
      setResults(data);
      setLoading(false);
    }
    load();
  }, []);

  // Summary stats
  const gradedResults = results.filter((r) => r.grade && !r.isAbsent);
  const avgPct = gradedResults.length > 0
    ? Math.round(gradedResults.reduce((s, r) => {
        return s + ((r.marksObtained / r.exam.totalMarks) * 100);
      }, 0) / gradedResults.length)
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, var(--color-primary)) 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{t("results.title") || "Exam Results"}</h1>
              <p className="text-xs text-white/70">{t("results.parentSubtitle") || "Academic performance history"}</p>
            </div>
          </div>

          {!loading && avgPct !== null && (
            <div className="text-right">
              <p className="text-2xl font-black text-white">{avgPct}%</p>
              <p className="text-[11px] text-white/60">{t("results.avgScore") || "Average Score"}</p>
            </div>
          )}
        </div>

        {!loading && (
          <div className="flex gap-3 mt-4">
            <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
              <p className="text-base font-black text-white">{results.length}</p>
              <p className="text-[11px] text-white/60">{t("exams.title") || "Exams"}</p>
            </div>
            <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
              <p className="text-base font-black text-white">
                {results.filter((r) => !r.isAbsent).length}
              </p>
              <p className="text-[11px] text-white/60">{t("attendance.present") || "Appeared"}</p>
            </div>
            <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)" }}>
              <p className="text-base font-black text-white">
                {results.filter((r) => r.isAbsent).length}
              </p>
              <p className="text-[11px] text-white/60">{t("attendance.absent") || "Absent"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Results List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
          {t("results.noRecords") || "No exam results yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => {
            const gradeStyle = r.grade ? (GRADE_COLORS[r.grade] ?? GRADE_COLORS["D"]) : null;
            const scorePct = !r.isAbsent && r.marksObtained !== null && r.exam.totalMarks
              ? Math.round((r.marksObtained / r.exam.totalMarks) * 100)
              : null;

            return (
              <div
                key={r.id}
                className="rounded-2xl p-4"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Grade Badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0"
                    style={
                      r.isAbsent
                        ? { background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #dc2626)" }
                        : gradeStyle
                        ? { background: gradeStyle.bg, color: gradeStyle.color }
                        : { background: "var(--color-bg-secondary)", color: "var(--color-text-muted)" }
                    }
                  >
                    {r.isAbsent ? "AB" : (r.grade ?? "—")}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                      {r.exam.title}
                    </p>
                    {r.exam.subject && (
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {r.exam.subject}
                      </p>
                    )}
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(r.exam.examDate).toLocaleDateString(isBn ? "bn-BD" : "en-BD", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    {r.isAbsent ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #dc2626)" }}>
                        {t("attendance.absent") || "Absent"}
                      </span>
                    ) : (
                      <>
                        <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                          {r.marksObtained ?? "—"}
                          <span className="text-xs font-normal text-muted"> /{r.exam.totalMarks}</span>
                        </p>
                        {scorePct !== null && (
                          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                            {scorePct}%
                          </p>
                        )}
                        {r.position && (
                          <p className="text-[11px] font-semibold" style={{ color: "var(--color-primary)" }}>
                            {t("results.rank") || "Rank"} #{r.position}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Score Bar */}
                {!r.isAbsent && scorePct !== null && (
                  <div className="mt-3">
                    <div className="w-full h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${scorePct}%`,
                          background: gradeStyle?.color ?? "var(--color-primary)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {r.remarks && (
                  <p className="text-xs mt-2 italic" style={{ color: "var(--color-text-muted)" }}>
                    "{r.remarks}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
