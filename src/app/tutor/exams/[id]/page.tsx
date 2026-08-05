"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getExamDetails, saveExamResults } from "@/actions/examActions";
import { Award, ArrowLeft, Loader2, Save, AlertCircle, CheckCircle } from "lucide-react";
import type { ExamDoc, ExamResultDoc } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ExamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.id;
  const router = useRouter();
  
  const { user, loading: authLoading } = useAuth();
  const [exam, setExam] = useState<ExamDoc | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, examId]);

  async function loadData() {
    setLoading(true);
    try {
      const { exam: examData, results: resultsData } = await getExamDetails(examId);
      setExam(examData);

      // Fetch students for this batch
      const { data: studentsData, error: studError } = await supabase
        .from("students")
        .select("id, full_name, phone")
        .eq("status", "active")
        .eq("tutor_id", examData.tutorId)
        .contains("enrolled_batch_ids", [examData.batchId]);

      if (studError) throw new Error(studError.message);
      
      setStudents(studentsData || []);

      // Pre-fill results state
      const initialResults: Record<string, any> = {};
      
      // Initialize with default empty values for all enrolled students
      (studentsData || []).forEach(s => {
        initialResults[s.id] = {
          studentId: s.id,
          marksObtained: "",
          isAbsent: false,
          remarks: "",
        };
      });

      // Override with saved results if they exist
      resultsData.forEach(r => {
        initialResults[r.studentId] = {
          studentId: r.studentId,
          marksObtained: r.marksObtained !== null ? r.marksObtained : "",
          isAbsent: r.isAbsent,
          remarks: r.remarks || "",
          // Read-only info from DB
          grade: r.grade,
          position: r.position
        };
      });

      setResults(initialResults);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load exam details");
    } finally {
      setLoading(false);
    }
  }

  const handleResultChange = (studentId: string, field: string, value: any) => {
    setResults(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveResults = async () => {
    setSaving(true);
    setError("");
    setSuccessMsg("");
    
    try {
      const formattedResults = Object.values(results).map(r => ({
        studentId: r.studentId,
        marksObtained: r.marksObtained === "" ? null : Number(r.marksObtained),
        isAbsent: r.isAbsent,
        remarks: r.remarks || null
      }));

      await saveExamResults({
        examId,
        results: formattedResults
      });
      
      setSuccessMsg("Exam results saved successfully! Grades and ranks have been calculated.");
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading exam details...</p>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
        <h2 className="text-xl font-bold text-red-700 mb-2 flex items-center gap-2">
          <AlertCircle className="w-6 h-6" />
          Error Loading Exam
        </h2>
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link href="/tutor/exams" className="text-indigo-600 font-medium hover:underline mt-4 inline-block">
          &larr; Back to Exams
        </Link>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/tutor/exams" className="text-indigo-600 text-sm font-semibold hover:underline flex items-center gap-1 w-fit mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Exams
        </Link>
        
        <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">{exam.title}</h1>
              {exam.subject && <p className="text-slate-500 dark:text-slate-400">{exam.subject}</p>}
            </div>
            
            <div className="flex gap-4">
              <div className="bg-slate-50 dark:bg-[#0b0f19] px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5 text-center">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Exam Date</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="bg-slate-50 dark:bg-[#0b0f19] px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5 text-center">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Total Marks</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{exam.totalMarks}</p>
              </div>
              {exam.passMarks && (
                <div className="bg-slate-50 dark:bg-[#0b0f19] px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5 text-center">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Pass Marks</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{exam.passMarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-[#0b0f19]">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Student Results</h2>
          <button
            onClick={handleSaveResults}
            disabled={saving}
            className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Results
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white dark:bg-[#131b2e] border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                <th className="p-4 pl-6">Student Name</th>
                <th className="p-4 w-32 text-center">Absent</th>
                <th className="p-4 w-40">Marks Obtained</th>
                <th className="p-4 w-32 text-center">Grade</th>
                <th className="p-4 w-24 text-center">Rank</th>
                <th className="p-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No students found in this batch.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const result = results[student.id] || {};
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 pl-6 font-medium text-slate-900 dark:text-slate-100">
                        {student.full_name}
                      </td>
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox"
                          checked={result.isAbsent || false}
                          onChange={(e) => handleResultChange(student.id, 'isAbsent', e.target.checked)}
                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={exam.totalMarks}
                          value={result.marksObtained}
                          onChange={(e) => handleResultChange(student.id, 'marksObtained', e.target.value)}
                          disabled={result.isAbsent}
                          placeholder="-"
                          className="w-full rounded-xl border-slate-200 dark:border-white/10 text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                      <td className="p-4 text-center">
                        {result.grade ? (
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            result.grade === 'F' ? 'bg-red-100 text-red-700' : 
                            result.grade.includes('A') ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-400' :
                            'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700'
                          }`}>
                            {result.grade}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {result.position || "-"}
                      </td>
                      <td className="p-4 pr-6">
                        <input
                          type="text"
                          value={result.remarks || ""}
                          onChange={(e) => handleResultChange(student.id, 'remarks', e.target.value)}
                          placeholder="Add remark..."
                          className="w-full rounded-xl border-slate-200 dark:border-white/10 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
