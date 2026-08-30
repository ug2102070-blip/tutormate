"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Lightbulb, MessageSquare, Copy, Check } from "lucide-react";
import { generateStudentAIEvaluation, type AIProgressReportResult } from "@/actions/aiProgressReportActions";

interface StudentReportAISectionProps {
  studentId: string;
  studentName: string;
}

export function StudentReportAISection({ studentId, studentName }: StudentReportAISectionProps) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<AIProgressReportResult["evaluation"] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"insights" | "guardian_bn" | "guardian_en">("insights");
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setErrorMsg("");
    startTransition(async () => {
      try {
        const res = await generateStudentAIEvaluation(studentId);
        if (res.success && res.evaluation) {
          setData(res.evaluation);
        } else {
          setErrorMsg(res.error || "Could not generate AI insights.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to contact AI service.");
      }
    });
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="rounded-2xl border p-6 space-y-4 print:break-inside-avoid shadow-xs"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold" style={{ color: "var(--color-text)" }}>
              AI Performance Insights & Guardian Note
            </h2>
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Powered by Google Gemini — analyzes real attendance, exams, fees, and tasks
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing student...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{data ? "Re-generate AI Report" : "Generate AI Insights"}</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Generated Content */}
      {data && (
        <div className="space-y-4 pt-2">
          {/* Executive Summary */}
          <div
            className="p-4 rounded-xl text-xs leading-relaxed font-medium border"
            style={{
              background: "rgba(99, 102, 241, 0.05)",
              borderColor: "rgba(99, 102, 241, 0.2)",
              color: "var(--color-text)",
            }}
          >
            <p className="font-bold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
              Executive Evaluation
            </p>
            <p>{data.summary}</p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("insights")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === "insights"
                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Key Strengths & Advice
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guardian_bn")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === "guardian_bn"
                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Guardian SMS (বাংলা)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guardian_en")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === "guardian_en"
                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Guardian SMS (English)
            </button>
          </div>

          {/* Tab 1: Detailed Insights */}
          {activeTab === "insights" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Strengths */}
              <div
                className="p-3.5 rounded-xl border space-y-2 text-xs"
                style={{
                  background: "rgba(16, 185, 129, 0.04)",
                  borderColor: "rgba(16, 185, 129, 0.2)",
                }}
              >
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Strengths</span>
                </div>
                <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                  {data.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Concerns */}
              <div
                className="p-3.5 rounded-xl border space-y-2 text-xs"
                style={{
                  background: "rgba(245, 158, 11, 0.04)",
                  borderColor: "rgba(245, 158, 11, 0.2)",
                }}
              >
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Areas for Focus</span>
                </div>
                {data.concerns.length === 0 ? (
                  <p className="text-slate-500 italic">No critical concerns noted.</p>
                ) : (
                  <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                    {data.concerns.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recommendations */}
              <div
                className="p-3.5 rounded-xl border space-y-2 text-xs"
                style={{
                  background: "rgba(99, 102, 241, 0.04)",
                  borderColor: "rgba(99, 102, 241, 0.2)",
                }}
              >
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-400 text-xs">
                  <Lightbulb className="w-4 h-4 shrink-0" />
                  <span>Tutor Action Plan</span>
                </div>
                <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside">
                  {data.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tab 2: Guardian Note (Bengali) */}
          {activeTab === "guardian_bn" && (
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                background: "var(--color-bg-secondary)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp / SMS Message Template (বাংলা)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(data.parentNoteBengali)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200 font-medium">
                {data.parentNoteBengali}
              </p>
            </div>
          )}

          {/* Tab 3: Guardian Note (English) */}
          {activeTab === "guardian_en" && (
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                background: "var(--color-bg-secondary)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp / SMS Message Template (English)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(data.parentNoteEnglish)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200 font-medium">
                {data.parentNoteEnglish}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
