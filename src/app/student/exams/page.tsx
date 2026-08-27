"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { getStudentExamResults } from "@/actions/examActions";
import { Award, Loader2, Calendar, BookOpen, AlertCircle, TrendingUp } from "lucide-react";
import type { ExamDoc, ExamResultDoc } from "@/types";

type ResultWithExam = {
  result: ExamResultDoc;
  exam: ExamDoc;
};

export default function StudentExamsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [results, setResults] = useState<ResultWithExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStudentExamResults();
      setResults(data.results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load exam results");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">{t("exams.loadingResults") || "Loading your results..."}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
        <h2 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {t("exams.errorLoading") || "Error Loading Results"}
        </h2>
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            {t("exams.title")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t("exams.subtitle")}</p>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center p-8 bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-white/10 shadow-xs mt-4">
          <div className="w-14 h-14 bg-slate-50 dark:bg-[#0b0f19] rounded-full flex items-center justify-center mx-auto mb-3">
            <Award className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{t("exams.noResults") || "No Results Yet"}</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto text-xs">
            {t("exams.noResultsDesc") || "You don't have any exam results yet. When your tutor publishes them, they will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {results.map(({ result, exam }) => {
            const percentage = result.marksObtained !== null && exam.totalMarks
              ? Math.round((result.marksObtained / exam.totalMarks) * 100)
              : 0;
              
            const isPassing = exam.passMarks ? (result.marksObtained !== null && result.marksObtained >= exam.passMarks) : null;

            return (
              <div key={result.id} className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-white/10 p-5 shadow-xs overflow-hidden relative">
                {/* Header info */}
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{exam.title}</h3>
                    {exam.subject && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
                        <BookOpen className="w-4 h-4" />
                        {exam.subject}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
                      <Calendar className="w-4 h-4" />
                      {new Date(exam.examDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  
                  {result.isAbsent ? (
                    <div className="bg-red-50 dark:bg-red-500/10 text-red-700 px-3 py-1.5 rounded-lg border border-red-100 text-xs font-bold tracking-wide">
                      {t("exams.absent") || "ABSENT"}
                    </div>
                  ) : result.grade ? (
                    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                      result.grade.includes('A') ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 text-emerald-800' :
                      result.grade === 'F' ? 'bg-red-50 dark:bg-red-500/10 border-red-100 text-red-800' :
                      'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 text-indigo-800'
                    }`}>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{t("exams.grade") || "Grade"}</p>
                        <p className="text-xl font-black leading-none">{result.grade}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-[#0b0f19] text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-semibold text-xs">
                      {t("exams.pendingGrade") || "Pending Grade"}
                    </div>
                  )}
                </div>

                {/* Main Stats Grid */}
                {!result.isAbsent && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-[#0b0f19] rounded-xl p-3 border border-slate-100 dark:border-white/5">
                    <div className="bg-white dark:bg-[#131b2e] rounded-lg p-2.5 shadow-xs border border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t("exams.marksObtained") || "Marks Obtained"}</p>
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {result.marksObtained !== null ? result.marksObtained : "-"} <span className="text-xs font-medium text-slate-400">/ {exam.totalMarks}</span>
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-[#131b2e] rounded-lg p-2.5 shadow-xs border border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t("exams.percentage") || "Percentage"}</p>
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {result.marksObtained !== null ? `${percentage}%` : "-"}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#131b2e] rounded-lg p-2.5 shadow-xs border border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t("exams.batchRank") || "Batch Rank"}</p>
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {result.position ? `#${result.position}` : "-"}
                        {result.position === 1 && <TrendingUp className="w-3.5 h-3.5 text-amber-500" />}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#131b2e] rounded-lg p-2.5 shadow-xs border border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t("exams.status") || "Status"}</p>
                      <p className={`text-base font-bold ${
                        isPassing === true ? 'text-emerald-600' : 
                        isPassing === false ? 'text-red-600 dark:text-red-400' : 
                        'text-slate-600 dark:text-slate-400'
                      }`}>
                        {isPassing === true ? (t("exams.passed") || 'Passed') : 
                         isPassing === false ? (t("exams.failed") || 'Failed') : 
                         '-'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Remarks Section */}
                {result.remarks && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 text-amber-900">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-amber-700 dark:text-amber-400">{t("exams.tutorRemarks") || "Tutor Remarks"}</p>
                    <p className="text-xs font-medium">"{result.remarks}"</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
