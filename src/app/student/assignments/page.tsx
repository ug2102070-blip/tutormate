"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getStudentSubmissions } from "@/actions/assignmentActions";
import { BookOpen, FileText, Loader2, ArrowRight, Clock, CheckCircle, FileDown, AlertCircle } from "lucide-react";
import type { BatchDoc } from "@/types";
import Link from "next/link";

export default function StudentAssignmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, selectedBatchId]);

  async function loadData() {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      // 1. Get student's enrolled batches
      const { data: studentDoc } = await supabase
        .from("students")
        .select("enrolled_batch_ids")
        .eq("auth_uid", user?.id)
        .single();
        
      if (studentDoc && studentDoc.enrolled_batch_ids.length > 0) {
        const { data: batchesData } = await supabase
          .from("batches")
          .select("*")
          .in("id", studentDoc.enrolled_batch_ids);
          
        if (batchesData) {
          setBatches(batchesData.map((b) => ({
            id: b.id,
            tutorId: b.tutor_id,
            name: b.name,
            subject: b.subject,
            gradeClass: b.grade_class,
            monthlyFee: b.monthly_fee,
            schedule: b.schedule,
            studentCount: b.student_count,
            isArchived: b.is_archived,
            createdAt: b.created_at,
          })));
        }
      }

      // 2. Load assignments (which comes as submissions for this student)
      const subs = await getStudentSubmissions(token);
      setSubmissions(subs);
    } catch (err) {
      console.error("Failed to load assignments data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return null;

  // Derive counts
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const gradedCount = submissions.filter(s => s.status === 'graded').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            My Assignments
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Submit your homework and view your grades.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 p-3 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{submissions.length}</div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 p-3 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pending</div>
            <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 p-3 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Graded</div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{gradedCount}</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* List */}
        <div className="p-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-500" />
              <p className="text-sm">Loading your assignments...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-[#0b0f19] rounded-full flex items-center justify-center mb-3">
                <BookOpen className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-800 dark:text-slate-200 font-bold mb-1">No Assignments</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                You have no assignments at the moment.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {submissions.map((sub) => {
                const isOverdue = sub.status === 'pending' && new Date(sub.assignmentDeadline) < new Date();
                
                return (
                  <div key={sub.id} className="p-5 hover:bg-slate-50 transition-colors flex gap-4 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {sub.status === 'pending' && !isOverdue && <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#252535] px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Clock className="w-3 h-3" /> Pending</span>}
                            {sub.status === 'pending' && isOverdue && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-200 dark:border-red-500/20"><AlertCircle className="w-3 h-3" /> Overdue</span>}
                            {sub.status === 'submitted' && <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-200 dark:border-amber-500/20"><FileDown className="w-3 h-3" /> Submitted</span>}
                            {sub.status === 'graded' && <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-200 dark:border-emerald-500/20"><CheckCircle className="w-3 h-3" /> Graded</span>}
                          </div>
                          
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg truncate">
                            {sub.assignmentTitle}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-medium">
                            <span className={`flex items-center ${isOverdue ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              Due: {new Date(sub.assignmentDeadline).toLocaleString()}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 dark:text-slate-400">Max Marks: {sub.assignmentMaxMarks}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0">
                          {sub.status === 'graded' && (
                            <div className="text-right">
                              <div className="text-2xl font-bold text-indigo-600 leading-none">{sub.marksObtained}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Marks</div>
                            </div>
                          )}
                          <Link
                            href={`/student/assignments/${sub.assignmentId}`}
                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            {sub.status === 'pending' ? 'Submit' : 'View'} <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
