"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getSubmissions, getAssignments, gradeSubmission } from "@/actions/assignmentActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import { ArrowLeft, CheckCircle, Clock, FileDown, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function AssignmentDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { user, loading: authLoading } = useAuth();
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, id]);

  async function loadData() {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      // Load assignment
      const assignments = await getAssignments(token);
      const assign = assignments.find((a: any) => a.id === id);
      if (assign) setAssignment(assign);

      // Load submissions
      const subs = await getSubmissions(id, token);
      setSubmissions(subs);
    } catch (err) {
      console.error("Failed to load assignment details:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = async (path: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const url = await getMediaSignedUrl(path, token);
      if (url) window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to get URL", err);
    }
  };

  const submitGrade = async (submissionId: string) => {
    try {
      setIsSubmitting(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      
      await gradeSubmission(submissionId, { marksObtained: marks, feedback }, token);
      
      setGradingId(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to save grade");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!assignment) {
    return <div>Assignment not found.</div>;
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const submittedCount = submissions.filter(s => s.status === 'submitted').length;
  const gradedCount = submissions.filter(s => s.status === 'graded').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/tutor/assignments" className="inline-flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Assignments
      </Link>

      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{assignment.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Due: {new Date(assignment.deadline).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-indigo-600">{assignment.maxMarks}</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Max Marks</p>
          </div>
        </div>
        
        {assignment.description && (
          <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0b0f19] p-4 rounded-xl text-sm border border-slate-100 dark:border-white/5">
            {assignment.description}
          </p>
        )}

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
          <div className="bg-slate-50 dark:bg-[#0b0f19] rounded-xl p-3 text-center border border-slate-100 dark:border-white/5">
            <div className="text-xl font-bold text-slate-700 dark:text-slate-300">{pendingCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase mt-1">Pending</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-center border border-amber-100">
            <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{submittedCount}</div>
            <div className="text-xs text-amber-600 font-medium uppercase mt-1">To Grade</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-100">
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{gradedCount}</div>
            <div className="text-xs text-emerald-600 font-medium uppercase mt-1">Graded</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0b0f19]/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Student Submissions</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 dark:border-white/5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                <th className="p-4">Student</th>
                <th className="p-4">Status</th>
                <th className="p-4">Submitted At</th>
                <th className="p-4 text-center">Marks</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No submissions yet.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{sub.studentName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{sub.studentPhone}</div>
                    </td>
                    <td className="p-4">
                      {sub.status === 'pending' && <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#252535] px-2 py-1 rounded-md text-xs font-semibold"><Clock className="w-3 h-3" /> Pending</span>}
                      {sub.status === 'submitted' && <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md text-xs font-semibold border border-amber-200 dark:border-amber-500/20"><FileDown className="w-3 h-3" /> Submitted</span>}
                      {sub.status === 'graded' && <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md text-xs font-semibold border border-emerald-200 dark:border-emerald-500/20"><CheckCircle className="w-3 h-3" /> Graded</span>}
                      {sub.status === 'late' && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md text-xs font-semibold border border-red-200 dark:border-red-500/20"><XCircle className="w-3 h-3" /> Late</span>}
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '-'}
                    </td>
                    <td className="p-4 text-center font-medium">
                      {sub.status === 'graded' ? (
                        <span className="text-slate-900 dark:text-slate-100">{sub.marksObtained} <span className="text-slate-400 text-xs">/ {assignment.maxMarks}</span></span>
                      ) : '-'}
                    </td>
                    <td className="p-4">
                      {sub.status !== 'pending' && (
                        <div className="flex items-center gap-2">
                          {sub.filePath && (
                            <button
                              onClick={() => handleDownload(sub.filePath)}
                              className="text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <FileDown className="w-3.5 h-3.5" /> View File
                            </button>
                          )}
                          
                          {gradingId === sub.id ? (
                            <div className="flex items-center gap-2 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 rounded-lg p-1 shadow-sm absolute right-12 z-10">
                              <input 
                                type="number" 
                                min={0} max={assignment.maxMarks}
                                className="w-16 px-2 py-1 text-sm border border-slate-200 dark:border-white/10 rounded outline-none"
                                value={marks}
                                onChange={(e) => setMarks(Number(e.target.value))}
                                placeholder="Marks"
                              />
                              <input 
                                type="text"
                                className="w-32 px-2 py-1 text-sm border border-slate-200 dark:border-white/10 rounded outline-none"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Feedback..."
                              />
                              <button
                                onClick={() => submitGrade(sub.id)}
                                disabled={isSubmitting}
                                className="px-2 py-1 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setGradingId(null)}
                                className="px-2 py-1 bg-slate-100 dark:bg-[#252535] text-slate-600 dark:text-slate-400 text-xs font-semibold rounded hover:bg-slate-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setGradingId(sub.id);
                                setMarks(sub.marksObtained || 0);
                                setFeedback(sub.feedback || "");
                              }}
                              className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#252535] hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              {sub.status === 'graded' ? 'Edit Grade' : 'Grade'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
