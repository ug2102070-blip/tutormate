"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getStudentExamResults } from "@/actions/examActions";
import { Award, Loader2, Calendar, BookOpen, AlertCircle, TrendingUp } from "lucide-react";
import type { ExamDoc, ExamResultDoc } from "@/types";

type ResultWithExam = {
  result: ExamResultDoc;
  exam: ExamDoc;
};

export default function StudentExamsPage() {
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<ResultWithExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      const data = await getStudentExamResults(token);
      setResults(data.results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load exam results");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading your results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
        <h2 className="text-xl font-bold text-red-700 mb-2 flex items-center gap-2">
          <AlertCircle className="w-6 h-6" />
          Error Loading Results
        </h2>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            My Exam Results
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track your performance and grades across all batches.</p>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs mt-6">
          <div className="w-16 h-16 bg-slate-50 dark:bg-[#0b0f19] rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Results Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto text-sm">
            You don't have any exam results yet. When your tutor publishes them, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {results.map(({ result, exam }) => {
            const percentage = result.marksObtained !== null && exam.totalMarks
              ? Math.round((result.marksObtained / exam.totalMarks) * 100)
              : 0;
              
            const isPassing = exam.passMarks ? (result.marksObtained !== null && result.marksObtained >= exam.passMarks) : null;

            return (
              <div key={result.id} className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-xs overflow-hidden relative">
                {/* Header info */}
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{exam.title}</h3>
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
                    <div className="bg-red-50 dark:bg-red-500/10 text-red-700 px-4 py-2 rounded-xl border border-red-100 font-bold tracking-wide">
                      ABSENT
                    </div>
                  ) : result.grade ? (
                    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${
                      result.grade.includes('A') ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 text-emerald-800' :
                      result.grade === 'F' ? 'bg-red-50 dark:bg-red-500/10 border-red-100 text-red-800' :
                      'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 text-indigo-800'
                    }`}>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Grade</p>
                        <p className="text-2xl font-black leading-none">{result.grade}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-[#0b0f19] text-slate-500 dark:text-slate-400 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 font-semibold text-sm">
                      Pending Grade
                    </div>
                  )}
                </div>

                {/* Main Stats Grid */}
                {!result.isAbsent && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-[#0b0f19] rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                    <div className="bg-white dark:bg-[#131b2e] rounded-xl p-3 shadow-xs border border-slate-100 dark:border-white/5">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Marks Obtained</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {result.marksObtained !== null ? result.marksObtained : "-"} <span className="text-sm font-medium text-slate-400">/ {exam.totalMarks}</span>
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-[#131b2e] rounded-xl p-3 shadow-xs border border-slate-100 dark:border-white/5">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Percentage</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {result.marksObtained !== null ? `${percentage}%` : "-"}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#131b2e] rounded-xl p-3 shadow-xs border border-slate-100 dark:border-white/5">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Batch Rank</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {result.position ? `#${result.position}` : "-"}
                        {result.position === 1 && <TrendingUp className="w-4 h-4 text-amber-500" />}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#131b2e] rounded-xl p-3 shadow-xs border border-slate-100 dark:border-white/5">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</p>
                      <p className={`text-lg font-bold ${
                        isPassing === true ? 'text-emerald-600' : 
                        isPassing === false ? 'text-red-600 dark:text-red-400' : 
                        'text-slate-600 dark:text-slate-400'
                      }`}>
                        {isPassing === true ? 'Passed' : 
                         isPassing === false ? 'Failed' : 
                         '-'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Remarks Section */}
                {result.remarks && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 text-amber-900">
                    <p className="text-xs font-bold uppercase tracking-wider mb-1 text-amber-700 dark:text-amber-400">Tutor Remarks</p>
                    <p className="text-sm font-medium">"{result.remarks}"</p>
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
